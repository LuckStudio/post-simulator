import { createDefaultState } from '../src/state/defaults.js';
import { deepMerge } from '../src/state/store.js';
import { createRenderContext } from '../src/render/context.js';
import { setMeasureContext } from '../src/render/text.js';

/**
 * Contexto de medida falso para Node: cada carácter mide medio cuerpo de letra.
 * Hace que el maquetado sea determinista sin necesidad de un canvas real.
 */
export function installFakeMeasure() {
  const ctx = {
    font: '400 10px sans-serif',
    measureText(t) {
      const size = Number(/([\d.]+)px/.exec(this.font)[1]);
      return { width: Array.from(String(t)).length * size * 0.5 };
    },
  };
  setMeasureContext(ctx);
  return ctx;
}

/** Recursos falsos: ninguna imagen cargada y sin vídeo. */
export const fakeAssets = () => ({ video: null, image: () => null });

/** Contexto de render para un estado por defecto con `patch` aplicado. */
export function rcFor(patch = {}) {
  return createRenderContext(deepMerge(createDefaultState(), patch), fakeAssets());
}
