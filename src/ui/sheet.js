import { overlays } from './overlays.js';
import { svgIcon } from './icons.js';

const DRAG_CLOSE_PX = 90;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Hoja inferior (bottom sheet): se desliza desde abajo, se cierra con el fondo, Escape, el botón
 * «atrás» del sistema o arrastrándola hacia abajo, y devuelve el foco a quien la abrió.
 *
 * @param {{title:string, content:Node, opener?:HTMLElement|null, onClose?:()=>void}} o
 * @returns {{close:(o?:{restoreFocus?:boolean})=>void, body:HTMLElement, root:HTMLElement}}
 */
export function openSheet({ title, content, opener = null, onClose }) {
  const el = (tag, cls, attrs = {}) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  const root = el('div', 'sheet-root');
  const backdrop = el('div', 'sheet-backdrop');
  const sheet = el('section', 'sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' });
  const handle = el('div', 'sheet-handle', { 'aria-hidden': 'true' });
  const head = el('header', 'sheet-head');
  const h2 = el('h2');
  h2.textContent = title;
  const closeBtn = el('button', 'btn icon ghost', { type: 'button', 'aria-label': 'Cerrar' });
  closeBtn.append(svgIcon('close', 20));
  head.append(h2, closeBtn);
  const body = el('div', 'sheet-body');
  body.append(content);
  sheet.append(handle, head, body);
  root.append(backdrop, sheet);
  document.body.append(root);

  let closed = false;
  let restoreFocus = true;

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);

  function finish() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.classList.remove('open');
    if (reducedMotion()) root.remove();
    else setTimeout(() => root.remove(), 220);
    onClose?.();
    if (restoreFocus && opener && document.contains(opener)) opener.focus();
  }
  const onBack = () => finish();

  function close(o = {}) {
    if (closed) return;
    restoreFocus = o.restoreFocus !== false;
    overlays.release(onBack);
    finish();
  }

  backdrop.addEventListener('pointerdown', () => close());
  closeBtn.addEventListener('click', () => close());
  overlays.push(onBack);

  // Arrastrar la cabecera hacia abajo cierra la hoja.
  let dragY = null;
  const drag = (zone) => {
    zone.style.touchAction = 'none';
    zone.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      dragY = e.clientY;
      zone.setPointerCapture?.(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (dragY == null) return;
      const dy = Math.max(0, e.clientY - dragY);
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = (e) => {
      if (dragY == null) return;
      const dy = e.clientY - dragY;
      dragY = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > DRAG_CLOSE_PX) close();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  };
  drag(handle);
  drag(head);

  requestAnimationFrame(() => {
    root.classList.add('open');
    sheet.focus({ preventScroll: true });
  });

  return { close, body, root };
}
