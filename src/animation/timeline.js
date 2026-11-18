import { TEXTUAL, isTextAnim } from './presets.js';

/** Clave base de un elemento: las tarjetas duplicadas del cierre terminan en "2". */
export const baseKey = (key) => key.replace(/2$/, '');

export function elementConfig(anim, key) {
  return anim.el[baseKey(key)] || { type: 'fade', dur: 0.6 };
}

/** Recorre los elementos de una slide en orden de dibujo (padres antes que hijos). */
export function flattenItems(slide) {
  const list = [];
  const walk = (it) => {
    list.push(it);
    (it.children || []).forEach(walk);
  };
  slide.items.forEach(walk);
  return list;
}

/**
 * Calcula cuándo empieza y cuánto dura la animación de cada elemento.
 * Escribe `_start`, `_dur` y `_type` en cada elemento y `total` en la slide.
 *
 * @param {object} slide  Slide construida (ver render/carousel.js).
 * @param {object} anim   Sección `anim` del estado.
 */
export function computeTimeline(slide, anim) {
  const list = flattenItems(slide);
  let prevStart = 0;
  let prevEnd = 0;
  let total = 0;

  list.forEach((it, i) => {
    const c = elementConfig(anim, it.key);
    const base = baseKey(it.key);
    let type = c.type;
    if (isTextAnim(type) && !TEXTUAL.has(base)) type = 'fade';
    if (type === 'count-up' && base !== 'stats') type = 'fade';

    let dur = type === 'none' ? 0.0001 : Math.max(0.1, c.dur);
    if (type === 'typewriter') dur = Math.max(0.4, (it.chars || 30) / Math.max(5, anim.cps));

    let start;
    if (i === 0) start = 0.15;
    else if (anim.order === 'secuencial') start = Math.max(prevStart, prevEnd - 0.05);
    else start = prevStart + (i === 1 ? Math.max(anim.stagger, list[0]._dur * 0.35) : anim.stagger);

    it._start = start;
    it._dur = dur;
    it._type = type;
    prevStart = start;
    prevEnd = start + dur;
    total = Math.max(total, start + dur);
  });

  slide.total = total + anim.hold;
  return slide;
}
