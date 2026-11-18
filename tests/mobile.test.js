import { describe, expect, it, vi } from 'vitest';
import { GESTURE, classifyRelease } from '../src/ui/gestures.js';
import { createOverlayStack } from '../src/ui/overlays.js';
import { canShareFiles, shareSlides } from '../src/export/share.js';

describe('classifyRelease', () => {
  it('un toque corto y quieto es un toque', () => {
    expect(classifyRelease({ dx: 2, dy: -3, dt: 120 })).toBe('tap');
  });
  it('un toque largo y quieto no es un toque (es la pulsación larga)', () => {
    expect(classifyRelease({ dx: 0, dy: 0, dt: GESTURE.tapMaxMs + 1 })).toBe('none');
  });
  it('un deslizamiento horizontal claro cambia de slide', () => {
    expect(classifyRelease({ dx: -90, dy: 10, dt: 200 })).toBe('swipe-left');
    expect(classifyRelease({ dx: 90, dy: -10, dt: 200 })).toBe('swipe-right');
  });
  it('un movimiento corto, vertical o en diagonal no hace nada', () => {
    expect(classifyRelease({ dx: 30, dy: 0, dt: 100 })).toBe('none');
    expect(classifyRelease({ dx: 80, dy: 90, dt: 100 })).toBe('none');
    expect(classifyRelease({ dx: 0, dy: 120, dt: 100 })).toBe('none');
    expect(classifyRelease({ dx: 70, dy: 60, dt: 100 })).toBe('none'); // casi diagonal: gana lo vertical
  });
});

/** Un `window` falso con historial: «atrás» dispara popstate como el navegador. */
function fakeWindow() {
  const listeners = [];
  const entries = [{}];
  let index = 0;
  const win = {
    addEventListener: (type, fn) => type === 'popstate' && listeners.push(fn),
    history: {
      pushState: (s) => {
        entries.splice(index + 1);
        entries.push(s);
        index++;
      },
      back: () => {
        if (index === 0) return;
        index--;
        listeners.forEach((fn) => fn());
      },
    },
  };
  return {
    win,
    pressBack: () => win.history.back(),
    get index() {
      return index;
    },
  };
}

describe('pila de capas y botón «atrás»', () => {
  it('«atrás» cierra la capa de arriba y no las demás', () => {
    const f = fakeWindow();
    const stack = createOverlayStack(f.win);
    const a = vi.fn();
    const b = vi.fn();
    stack.push(a);
    stack.push(b);
    expect(stack.depth).toBe(2);
    f.pressBack();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
    expect(stack.depth).toBe(1);
    f.pressBack();
    expect(a).toHaveBeenCalledOnce();
    expect(stack.depth).toBe(0);
    expect(f.index).toBe(0);
  });
  it('cerrar desde la interfaz retira la entrada del historial sin volver a llamar a close', () => {
    const f = fakeWindow();
    const stack = createOverlayStack(f.win);
    const close = vi.fn();
    stack.push(close);
    expect(f.index).toBe(1);
    expect(stack.release(close)).toBe(true);
    expect(close).not.toHaveBeenCalled();
    expect(stack.depth).toBe(0);
    expect(f.index).toBe(0);
  });
  it('liberar una capa que ya no está abierta no toca el historial', () => {
    const f = fakeWindow();
    const stack = createOverlayStack(f.win);
    expect(stack.release(() => {})).toBe(false);
    expect(f.index).toBe(0);
  });
  it('abrir dos capas y cerrarlas desde la interfaz deja el historial como estaba', () => {
    const f = fakeWindow();
    const stack = createOverlayStack(f.win);
    const a = vi.fn();
    const b = vi.fn();
    stack.push(a);
    stack.push(b);
    stack.release(b);
    stack.release(a);
    expect(f.index).toBe(0);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
  it('sin ventana (Node) no hace nada ni falla', () => {
    const stack = createOverlayStack(undefined);
    const close = vi.fn();
    stack.push(close);
    expect(stack.release(close)).toBe(true);
  });
});

describe('compartir con la hoja nativa', () => {
  const nav = (over = {}) => ({ share: vi.fn(async () => {}), canShare: vi.fn(() => true), ...over });
  const slides = [{ index: 0 }, { index: 1 }];
  const common = {
    slides,
    renderBlob: async () => new Blob(['x'], { type: 'image/png' }),
    fileName: (s) => `s${s.index}.png`,
  };

  it('canShareFiles exige share y canShare', () => {
    expect(canShareFiles([], nav())).toBe(true);
    expect(canShareFiles([], { share() {} })).toBe(false);
    expect(canShareFiles([], nav({ canShare: () => false }))).toBe(false);
    expect(
      canShareFiles(
        [],
        nav({
          canShare: () => {
            throw new Error('x');
          },
        }),
      ),
    ).toBe(false);
    expect(canShareFiles([], undefined)).toBe(false);
  });
  it('comparte un archivo PNG por slide con su nombre', async () => {
    const n = nav();
    const r = await shareSlides({ ...common, title: 'Mi marca', nav: n });
    expect(r.status).toBe('shared');
    const arg = n.share.mock.calls[0][0];
    expect(arg.files.map((f) => f.name)).toEqual(['s0.png', 's1.png']);
    expect(arg.files.every((f) => f.type === 'image/png')).toBe(true);
    expect(arg.title).toBe('Mi marca');
  });
  it('si el navegador no puede compartir archivos, lo dice para que se descargue', async () => {
    expect((await shareSlides({ ...common, nav: nav({ canShare: () => false }) })).status).toBe('unsupported');
  });
  it('cerrar la hoja sin elegir nada no es un error', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' });
    expect(
      (
        await shareSlides({
          ...common,
          nav: nav({
            share: async () => {
              throw abort;
            },
          }),
        })
      ).status,
    ).toBe('cancelled');
  });
  it('un fallo real se notifica como error', async () => {
    const r = await shareSlides({
      ...common,
      nav: nav({
        share: async () => {
          throw new Error('no');
        },
      }),
    });
    expect(r.status).toBe('error');
  });
});
