/** Umbrales de los gestos táctiles sobre la vista previa. */
export const GESTURE = {
  tapMaxMove: 10, // px: más que esto ya no es un toque
  tapMaxMs: 350, // un toque largo no es un toque
  longPressMs: 500,
  swipeMin: 48, // px horizontales mínimos para un deslizamiento
  swipeRatio: 1.5, // lo horizontal debe ganar a lo vertical por esta proporción
};

/**
 * Clasifica el final de un toque a partir de lo que se movió y lo que duró.
 * @returns {'tap'|'swipe-left'|'swipe-right'|'none'}
 */
export function classifyRelease({ dx, dy, dt }) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax <= GESTURE.tapMaxMove && ay <= GESTURE.tapMaxMove) return dt <= GESTURE.tapMaxMs ? 'tap' : 'none';
  if (ax >= GESTURE.swipeMin && ax > ay * GESTURE.swipeRatio) return dx < 0 ? 'swipe-left' : 'swipe-right';
  return 'none';
}

/**
 * Reconoce toque, deslizamiento, pulsación larga y arrastre sobre `el` (solo táctil o lápiz; con el
 * ratón no hace nada para no interferir en el escritorio). El elemento debe tener `touch-action: none`.
 *
 * @param {HTMLElement} el
 * @param {{onTap?:()=>void, onSwipe?:(dir:'next'|'prev')=>void, onLongPress?:()=>void,
 *          onDrag?:(d:{dx:number,dy:number})=>void, canSwipe?:()=>boolean, canDrag?:()=>boolean}} h
 */
export function attachGestures(
  el,
  { onTap, onSwipe, onLongPress, onDrag, canSwipe = () => true, canDrag = () => false },
) {
  let start = null;
  let last = null;
  let timer = null;
  let longPressed = false;
  let dragged = false;
  const stopTimer = () => {
    clearTimeout(timer);
    timer = null;
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    last = { x: e.clientX, y: e.clientY };
    longPressed = false;
    dragged = false;
    el.setPointerCapture?.(e.pointerId);
    stopTimer();
    if (onLongPress) {
      timer = setTimeout(() => {
        longPressed = true;
        onLongPress();
      }, GESTURE.longPressMs);
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > GESTURE.tapMaxMove) stopTimer();
    if (canDrag() && !longPressed && Math.hypot(dx, dy) > GESTURE.tapMaxMove) {
      dragged = true;
      onDrag?.({ dx: e.clientX - last.x, dy: e.clientY - last.y });
    }
    last = { x: e.clientX, y: e.clientY };
  });

  el.addEventListener('pointerup', (e) => {
    if (!start || e.pointerId !== start.id) return;
    stopTimer();
    const s = start;
    start = null;
    if (longPressed) {
      // Al soltar, el navegador genera un clic sobre lo que haya bajo el dedo: tras abrir una hoja
      // sería uno de sus botones. Se descarta ese clic de compatibilidad.
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      const types = ['mousedown', 'mouseup', 'click'];
      types.forEach((t) => document.addEventListener(t, swallow, true));
      setTimeout(() => types.forEach((t) => document.removeEventListener(t, swallow, true)), 450);
      return;
    }
    if (dragged) return;
    const kind = classifyRelease({ dx: e.clientX - s.x, dy: e.clientY - s.y, dt: performance.now() - s.t });
    if (kind === 'tap') onTap?.();
    else if (kind === 'swipe-left' && canSwipe()) onSwipe?.('next');
    else if (kind === 'swipe-right' && canSwipe()) onSwipe?.('prev');
  });

  el.addEventListener('pointercancel', () => {
    stopTimer();
    start = null;
  });
}
