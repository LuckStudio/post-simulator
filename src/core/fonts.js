import { STANDARD_FONTS } from './constants.js';

/**
 * Agrupa las tipografías para el selector: estándar, recientes y todas las instaladas.
 * - `recent` no repite las estándar; si la fuente actual no es estándar, va la primera.
 * - `all` no repite las estándar ni las recientes.
 *
 * @param {{current:string, recent?:string[], installed?:string[]}} o
 * @returns {{standard:{value:string,label:string}[], recent:string[], all:string[]}}
 */
export function groupFonts({ current, recent = [], installed = [] }) {
  const standardKeys = new Set(STANDARD_FONTS.map(([k]) => k));
  const standardNames = new Set(STANDARD_FONTS.map(([, l]) => l.toLowerCase()));
  const isStandard = (n) => standardKeys.has(n) || standardNames.has(String(n).toLowerCase());

  const rec = [];
  const push = (name) => {
    if (name && !isStandard(name) && !rec.includes(name)) rec.push(name);
  };
  push(current);
  recent.forEach(push);

  const all = [...new Set(installed)]
    .filter((n) => !isStandard(n) && !rec.includes(n))
    .sort((a, b) => a.localeCompare(b, 'es'));

  return { standard: STANDARD_FONTS.map(([value, label]) => ({ value, label })), recent: rec, all };
}

/** Nombre de fuente seguro para usarlo en CSS/canvas: sin comillas, barras ni llaves. */
export const sanitizeFontName = (s) =>
  String(s ?? '')
    .replace(/["\\;{}<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
