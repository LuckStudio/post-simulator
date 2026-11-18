import { clamp } from '../core/utils.js';
import { ICON, strokeIcon } from './icons.js';
import { drawContain, drawCover, ellip, rr, srcSize } from './primitives.js';

/** ¿Hay multimedia que mostrar en el post? */
export function hasMedia(rc) {
  const m = rc.state.media;
  if (m.type === 'none') return false;
  if (m.type === 'video') return !!rc.assets.video;
  return m.items.length > 0;
}

/** Alto natural de la multimedia para un ancho de tarjeta dado. */
export function mediaNaturalHeight(rc, cardW) {
  const m = rc.state.media;
  let ar = null;
  if (m.aspect !== 'auto') {
    const [a, b] = m.aspect.split(':').map(Number);
    ar = a / b;
  }
  if (!ar) {
    if (m.type === 'image') {
      const im = rc.assets.image(m.items[0]);
      ar = im ? srcSize(im)[0] / srcSize(im)[1] : 1.2;
    } else if (m.type === 'grid') {
      const n = m.items.length;
      ar = n <= 1 ? 1.2 : n === 2 ? 1.5 : 1;
    } else if (m.type === 'video') {
      const v = rc.assets.video;
      ar = v && v.videoWidth ? v.videoWidth / v.videoHeight : 16 / 9;
    } else if (m.type === 'document') {
      const im = rc.assets.image(m.items[0]);
      ar = im ? srcSize(im)[0] / srcSize(im)[1] : 0.77;
    }
  }
  ar = clamp(ar || 1, 0.5, 2.6);
  let h = cardW / ar;
  if (m.type === 'document') h += 76 * rc.S;
  return h;
}

/**
 * Dibuja la multimedia en la caja `b`.
 * @param {number|null} lt  Tiempo local de la animación (null = imagen estática).
 */
export function drawMedia(ctx, rc, b, lt) {
  const m = rc.state.media;
  const t = rc.theme;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  if (m.type === 'image') {
    const im = rc.assets.image(m.items[0]);
    if (im) drawCover(ctx, im, b.x, b.y, b.w, b.h, m.fx, m.fy, m.zoom);
    else {
      ctx.fillStyle = t.doc;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  } else if (m.type === 'grid') drawGrid(ctx, rc, b);
  else if (m.type === 'video') drawVideo(ctx, rc, b);
  else if (m.type === 'document') drawDoc(ctx, rc, b, lt);
  ctx.restore();
}

function drawVideo(ctx, rc, b) {
  const m = rc.state.media;
  const S = rc.S;
  const v = rc.assets.video;
  ctx.fillStyle = '#000';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (v && v.readyState >= 2) drawCover(ctx, v, b.x, b.y, b.w, b.h, m.fx, m.fy, m.zoom);
  if (m.playIcon && (!v || v.paused)) {
    const r = 64 * S;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4 * S;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 18 * S, cy - 28 * S);
    ctx.lineTo(cx + 30 * S, cy);
    ctx.lineTo(cx - 18 * S, cy + 28 * S);
    ctx.closePath();
    ctx.fill();
  }
}

/** Distribuciones de la cuadrícula por número de imágenes: [x, y, ancho, alto] relativos. */
const GRID_LAYOUTS = {
  1: [[0, 0, 1, 1]],
  2: [
    [0, 0, 0.5, 1],
    [0.5, 0, 0.5, 1],
  ],
  3: [
    [0, 0, 1, 0.6],
    [0, 0.6, 0.5, 0.4],
    [0.5, 0.6, 0.5, 0.4],
  ],
  4: [
    [0, 0, 1, 0.6],
    [0, 0.6, 1 / 3, 0.4],
    [1 / 3, 0.6, 1 / 3, 0.4],
    [2 / 3, 0.6, 1 / 3, 0.4],
  ],
  many: [
    [0, 0, 0.5, 0.6],
    [0.5, 0, 0.5, 0.6],
    [0, 0.6, 1 / 3, 0.4],
    [1 / 3, 0.6, 1 / 3, 0.4],
    [2 / 3, 0.6, 1 / 3, 0.4],
  ],
};

function drawGrid(ctx, rc, b) {
  const m = rc.state.media;
  const t = rc.theme;
  const S = rc.S;
  const n = m.items.length;
  const g = 5 * S;
  ctx.fillStyle = t.card;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const rects = n <= 4 && GRID_LAYOUTS[n] ? GRID_LAYOUTS[n] : GRID_LAYOUTS.many;
  rects.forEach((r, i) => {
    const x0 = b.x + r[0] * b.w + (r[0] > 0.001 ? g / 2 : 0);
    const x1 = b.x + (r[0] + r[2]) * b.w - (r[0] + r[2] < 0.999 ? g / 2 : 0);
    const y0 = b.y + r[1] * b.h + (r[1] > 0.001 ? g / 2 : 0);
    const y1 = b.y + (r[1] + r[3]) * b.h - (r[1] + r[3] < 0.999 ? g / 2 : 0);
    const im = rc.assets.image(m.items[i]);
    if (im) drawCover(ctx, im, x0, y0, x1 - x0, y1 - y0);
    else {
      ctx.fillStyle = t.doc;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (i === 4 && n > 5) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = '#fff';
      ctx.font = rc.font(600, 64 * S);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+' + (n - 5), (x0 + x1) / 2, (y0 + y1) / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  });
}

function drawDoc(ctx, rc, b, lt) {
  const m = rc.state.media;
  const t = rc.theme;
  const S = rc.S;
  const N = m.items.length;
  const bar = 76 * S;
  ctx.fillStyle = t.card;
  ctx.fillRect(b.x, b.y, b.w, bar);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = rc.font(600, 28 * S);
  ctx.fillStyle = t.text;
  const title = ellip(ctx, m.docTitle, b.w * 0.6);
  ctx.fillText(title, b.x + 40 * S, b.y + 48 * S);
  const tw = ctx.measureText(title).width;
  ctx.font = rc.font(400, 26 * S);
  ctx.fillStyle = t.muted;
  ctx.fillText(` • ${N} ${N === 1 ? 'página' : 'páginas'}`, b.x + 40 * S + tw, b.y + 48 * S);

  const ay = b.y + bar;
  const ah = b.h - bar;
  ctx.fillStyle = t.doc;
  ctx.fillRect(b.x, ay, b.w, ah);
  let idx = clamp(Math.round(m.docPage), 0, N - 1);
  if (m.docAuto && lt != null && N > 1) idx = Math.floor(Math.max(0, lt) / 1.4) % N;
  const im = rc.assets.image(m.items[idx]);
  if (im) drawContain(ctx, im, b.x, ay, b.w, ah);

  const label = `${idx + 1} / ${N}`;
  ctx.font = rc.font(600, 24 * S);
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  rr(ctx, b.x + 24 * S, ay + ah - 70 * S, lw + 32 * S, 46 * S, 23 * S);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, b.x + 40 * S, ay + ah - 39 * S);

  if (N > 1) {
    const r = 34 * S;
    const cx = b.x + b.w - 60 * S;
    const cy = ay + ah / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 12 * S;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.fill();
    ctx.restore();
    strokeIcon(ctx, ICON.arrow, cx - 16 * S, cy - 16 * S, 32 * S, '#222', 2.4);
  }
}
