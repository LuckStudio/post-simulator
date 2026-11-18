/**
 * Detección de tipografías instaladas en el dispositivo.
 * - Con la API "Local Font Access" (Chrome/Edge, pide permiso) se obtienen todas.
 * - Si no está disponible o está bloqueada, se prueba una lista de fuentes habituales.
 */

/** Fuentes habituales en Windows, macOS, Linux y Android para el modo de reserva. */
const COMMON_FONTS = [
  'Arial',
  'Arial Narrow',
  'Avenir',
  'Avenir Next',
  'Baskerville',
  'Book Antiqua',
  'Calibri',
  'Cambria',
  'Candara',
  'Cantarell',
  'Century Gothic',
  'Consolas',
  'Courier New',
  'DejaVu Sans',
  'DejaVu Serif',
  'Didot',
  'Fira Sans',
  'Franklin Gothic Medium',
  'Futura',
  'Garamond',
  'Geneva',
  'Georgia',
  'Gill Sans',
  'Helvetica',
  'Helvetica Neue',
  'Impact',
  'Liberation Sans',
  'Lato',
  'Lucida Grande',
  'Menlo',
  'Montserrat',
  'Noto Sans',
  'Noto Serif',
  'Open Sans',
  'Optima',
  'Palatino',
  'Poppins',
  'Roboto',
  'Rockwell',
  'Segoe UI',
  'SF Pro Text',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Ubuntu',
  'Verdana',
];

const BASELINES = ['monospace', 'serif', 'sans-serif'];
const SAMPLE = 'mmmmmmmmmmlliWW@#ÁÑ0123456789';
let ctx = null;

/** ¿Está instalada esta fuente? Compara el ancho de un texto con y sin ella frente a tres tipografías base. */
export function isFontInstalled(name) {
  ctx ??= document.createElement('canvas').getContext('2d');
  return BASELINES.some((base) => {
    ctx.font = `72px ${base}`;
    const without = ctx.measureText(SAMPLE).width;
    ctx.font = `72px "${name}", ${base}`;
    return ctx.measureText(SAMPLE).width !== without;
  });
}

/**
 * Lista las tipografías instaladas.
 * @returns {Promise<{names:string[], source:'system'|'common'}>}
 * @throws {DOMException} NotAllowedError si el usuario rechaza el permiso.
 */
export async function detectInstalledFonts() {
  if (typeof window.queryLocalFonts === 'function') {
    try {
      const list = await window.queryLocalFonts();
      const names = [...new Set(list.map((f) => f.family))].sort((a, b) => a.localeCompare(b, 'es'));
      return { names, source: 'system' };
    } catch (e) {
      if (e && e.name === 'NotAllowedError') throw e;
      // Bloqueada por la política del contexto (p. ej. dentro de un iframe): se usa la lista básica.
    }
  }
  return { names: COMMON_FONTS.filter(isFontInstalled), source: 'common' };
}
