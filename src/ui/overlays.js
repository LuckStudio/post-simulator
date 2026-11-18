/**
 * Pila de capas (hojas inferiores, vista completa…) integrada con el botón «atrás».
 *
 * En el móvil, «atrás» debe cerrar la capa abierta en vez de salir de la herramienta. Cada capa
 * añade una entrada al historial al abrirse; si el usuario pulsa «atrás» se cierra la capa de
 * arriba, y si se cierra desde la propia interfaz se retira su entrada sin reabrir nada.
 *
 * Se puede inyectar `win` (con `history` y `addEventListener`) para probarlo sin navegador.
 */
export function createOverlayStack(win = globalThis.window) {
  /** @type {Array<() => void>} */
  const stack = [];
  let swallow = 0;

  win?.addEventListener('popstate', () => {
    if (swallow > 0) {
      swallow--;
      return;
    }
    const close = stack.pop();
    close?.();
  });

  return {
    /** Abre una capa. `close` se llama solo si el usuario pulsa «atrás». */
    push(close) {
      win?.history.pushState({ overlay: true }, '');
      stack.push(close);
    },
    /**
     * La capa se cerró desde la interfaz (botón, fondo, Escape…): se retira su entrada del
     * historial sin llamar a `close`. Devuelve false si esa capa ya no estaba abierta.
     */
    release(close) {
      const i = stack.lastIndexOf(close);
      if (i === -1) return false;
      stack.splice(i, 1);
      if (win) {
        swallow++;
        win.history.back();
      }
      return true;
    },
    get depth() {
      return stack.length;
    },
  };
}

export const overlays = createOverlayStack();
