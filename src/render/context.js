import { FONTS, FORMATS, THEMES } from '../core/constants.js';

/**
 * Contexto de render: todo lo que necesita un dibujante para pintar una slide.
 * Se crea una vez por construcción del carrusel, de modo que el render es una
 * función de (estado, recursos) y no depende de variables globales.
 *
 * @typedef {object} RenderContext
 * @property {import('../state/defaults.js').ProjectState} state
 * @property {ReturnType<import('./assets.js').createAssets>} assets
 * @property {number} W  Ancho nativo en px.
 * @property {number} H  Alto nativo en px.
 * @property {number} S  Escala respecto al lado corto de 1080 px.
 * @property {object} theme  Paleta de THEMES.
 * @property {(weight:number, size:number) => string} font  Construye un `ctx.font`.
 * @property {number} slideCount  Número total de slides (para el paginador).
 */

export function canvasSize(format) {
  const [W, H] = FORMATS[format] || FORMATS['4:5'];
  return { W, H, S: Math.min(W, H) / 1080 };
}

/** Pila tipográfica de una clave estándar o de cualquier nombre de fuente instalada. */
export function fontFamily(fontKey) {
  if (FONTS[fontKey]) return FONTS[fontKey];
  const name = String(fontKey || '')
    .replace(/["\\;{}<>]/g, '')
    .trim();
  return name ? `"${name}", ${FONTS.system}` : FONTS.system;
}

/** Devuelve una función (peso, tamaño) → valor de `ctx.font` para la tipografía elegida. */
export function fontFn(fontKey) {
  const family = fontFamily(fontKey);
  return (w, s) => `${w} ${Math.round(s * 10) / 10}px ${family}`;
}

/** @returns {RenderContext} */
export function createRenderContext(state, assets) {
  const { W, H, S } = canvasSize(state.format);
  return {
    state,
    assets,
    W,
    H,
    S,
    theme: THEMES[state.style.theme] || THEMES.light,
    font: fontFn(state.style.font),
    slideCount: 0,
  };
}
