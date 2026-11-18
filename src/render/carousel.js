import { clamp } from '../core/utils.js';
import { computeTimeline } from '../animation/timeline.js';
import { drawBg, drawCard, drawSlideFooter } from './chrome.js';
import { createRenderContext } from './context.js';
import { withAnim } from './effects.js';
import { buildPostPages, postGeometry } from './layout.js';
import { rr } from './primitives.js';
import { coverSlide } from './slides/cover.js';
import { ctaSlides } from './slides/cta.js';
import { postSlide } from './slides/post.js';

/**
 * Un elemento dibujable de una slide. Las tarjetas (`key` empieza por "card")
 * se dibujan solas y recortan a sus hijos; el resto llama a `draw`.
 *
 * @typedef {object} SlideItem
 * @property {string} key  Clave de animación (ver EL_GROUPS); "2" al final en la 2.ª tarjeta del cierre.
 * @property {{x:number,y:number,w:number,h:number}} box
 * @property {SlideItem[]} [children]
 * @property {number} [chars]  Caracteres, para calcular la duración de la máquina de escribir.
 * @property {(ctx:CanvasRenderingContext2D, p:number, type:string, localT:number|null) => void} [draw]
 *
 * @typedef {object} Slide
 * @property {'cover'|'post'|'cta'} type
 * @property {string} label
 * @property {number} index
 * @property {boolean} hasMedia
 * @property {number} total  Duración de la animación en segundos (incluye la pausa final).
 * @property {SlideItem[]} items
 *
 * @typedef {{rc: import('./context.js').RenderContext, slides: Slide[]}} Carousel
 */

/** Construye el carrusel completo (portada + post + cierre) para un estado. */
export function buildCarousel(state, assets) {
  const rc = createRenderContext(state, assets);
  const G = postGeometry(rc);
  const slides = [];
  if (state.cover.on) slides.push(coverSlide(rc, G));
  const pages = buildPostPages(rc, G);
  pages.forEach((pg, i) => slides.push(postSlide(rc, pg, G, i, pages.length)));
  if (state.cta.on) slides.push(...ctaSlides(rc, G));
  slides.forEach((s, i) => {
    s.index = i;
    computeTimeline(s, state.anim, { videoSeconds: assets.video?.duration });
  });
  rc.slideCount = slides.length;
  return { rc, slides };
}

/**
 * Dibuja una slide en `ctx`.
 * @param {number|null} t  Segundos desde el inicio de su animación; null = estado final estático.
 */
export function drawSlide(ctx, rc, slide, t) {
  const { W, H } = rc;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, rc);

  const drawItem = (it) => {
    const p = t == null ? 1 : clamp((t - it._start) / it._dur);
    const type = t == null ? 'none' : it._type;
    if (t != null && type !== 'none' && t < it._start) return;
    withAnim(ctx, rc, type, p, it.box, () => {
      if (it.key.startsWith('card')) {
        drawCard(ctx, rc, it.box);
        ctx.save();
        rr(ctx, it.box.x, it.box.y, it.box.w, it.box.h, rc.state.style.radius * rc.S);
        ctx.clip();
        (it.children || []).forEach(drawItem);
        ctx.restore();
      } else it.draw(ctx, p, type, t == null ? null : t - it._start);
    });
  };

  slide.items.forEach(drawItem);
  drawSlideFooter(ctx, rc, slide);
  ctx.restore();
}

/** Crea un canvas a tamaño nativo con la slide dibujada. */
export function renderSlideToCanvas(rc, slide, t = null) {
  const c = document.createElement('canvas');
  c.width = rc.W;
  c.height = rc.H;
  drawSlide(c.getContext('2d'), rc, slide, t);
  return c;
}
