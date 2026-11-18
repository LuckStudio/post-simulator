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

const MAX_SLIDE_SECONDS = 300;
const clampSeconds = (s) => Math.min(MAX_SLIDE_SECONDS, Math.max(1, Number(s) || 1));

/**
 * Duración total de una slide.
 * - Slide con vídeo: 'full' = el vídeo entero (o la animación, si dura más); 'custom' = los segundos
 *   indicados (más o menos que el vídeo); 'auto' = como las demás.
 * - Resto: 'auto' = animación + pausa final; 'fixed' = los segundos indicados.
 *
 * @param {{animEnd:number, anim:object, hasVideo?:boolean, videoSeconds?:number}} o
 */
export function resolveSlideDuration({ animEnd, anim, hasVideo = false, videoSeconds = 0 }) {
  if (hasVideo) {
    const v = anim.videoDuration;
    if (v?.mode === 'full' && Number.isFinite(videoSeconds) && videoSeconds > 0) {
      return Math.max(animEnd, videoSeconds) + 0.2;
    }
    if (v?.mode === 'custom') return clampSeconds(v.seconds);
  }
  if (anim.duration?.mode === 'fixed') return clampSeconds(anim.duration.seconds);
  return animEnd + anim.hold;
}

/**
 * Calcula cuándo empieza y cuánto dura la animación de cada elemento.
 * Escribe `_start`, `_dur` y `_type` en cada elemento y `total` en la slide.
 *
 * @param {object} slide  Slide construida (ver render/carousel.js).
 * @param {object} anim   Sección `anim` del estado.
 * @param {{videoSeconds?:number}} [opts]  Duración del vídeo subido, si lo hay.
 */
export function computeTimeline(slide, anim, opts = {}) {
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

  slide.total = resolveSlideDuration({
    animEnd: total,
    anim,
    hasVideo: !!slide.hasVideo,
    videoSeconds: opts.videoSeconds,
  });
  return slide;
}
