import { lum } from '../core/color.js';
import { drawCover, rr } from './primitives.js';

/** Fondo de la slide: tema, color, degradado o imagen oscurecida. */
export function drawBg(ctx, rc) {
  const { W, H, state } = rc;
  const s = state.style;
  ctx.fillStyle = rc.theme.bg;
  ctx.fillRect(0, 0, W, H);
  if (s.bgMode === 'color') {
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, W, H);
  } else if (s.bgMode === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, s.bg);
    g.addColorStop(1, s.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (s.bgMode === 'image') {
    const im = rc.assets.image(s.bgImage);
    if (im) {
      drawCover(ctx, im, 0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${s.bgDim})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

/** ¿El fondo es oscuro? Decide el color del pie de slide. */
export function bgIsDark(style) {
  if (style.bgMode === 'image') return true;
  if (style.bgMode === 'color') return lum(style.bg) < 0.4;
  if (style.bgMode === 'gradient') return (lum(style.bg) + lum(style.bg2)) / 2 < 0.4;
  return style.theme === 'dark';
}

/** Tarjeta blanca (o gris oscuro) con sombra o borde. */
export function drawCard(ctx, rc, b) {
  const { S, theme: t } = rc;
  const st = rc.state.style;
  ctx.save();
  if (st.shadow) {
    ctx.shadowColor = st.theme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.10)';
    ctx.shadowBlur = (st.shadowBlur ?? 44) * S;
    ctx.shadowOffsetY = 10 * S;
  }
  ctx.fillStyle = t.card;
  rr(ctx, b.x, b.y, b.w, b.h, st.radius * S);
  ctx.fill();
  ctx.restore();
  if (!st.shadow) {
    ctx.save();
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 2 * S;
    rr(ctx, b.x, b.y, b.w, b.h, st.radius * S);
    ctx.stroke();
    ctx.restore();
  }
}

/** Pie de la slide: usuario a la izquierda y "n/N" a la derecha. */
export function drawSlideFooter(ctx, rc, slide) {
  const { W, H, S, state } = rc;
  const s = state.style;
  const M = s.margin * S;
  const y = H - M * 0.55 - 4 * S;
  ctx.save();
  ctx.font = rc.font(500, 24 * S);
  ctx.fillStyle = bgIsDark(s) ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.5)';
  ctx.textBaseline = 'alphabetic';
  if (s.footerHandle && state.cta.handle) {
    ctx.textAlign = 'left';
    ctx.fillText(state.cta.handle, M, y);
  }
  if (s.pager && rc.slideCount > 1) {
    ctx.textAlign = 'right';
    ctx.fillText(`${slide.index + 1}/${rc.slideCount}`, W - M, y);
  }
  ctx.restore();
}

/** Avatar del autor: imagen o iniciales sobre color; cuadrado (empresa) o círculo (persona). */
export function drawAvatar(ctx, rc, x, y, s) {
  const A = rc.state.author;
  ctx.save();
  if (A.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  } else rr(ctx, x, y, s, s, s * 0.12);
  ctx.clip();
  const im = rc.assets.image(A.avatar);
  if (im) drawCover(ctx, im, x, y, s, s);
  else {
    ctx.fillStyle = A.avatarColor || '#2E5E4E';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#fff';
    ctx.font = rc.font(600, s * 0.38);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((A.initials || '').slice(0, 3), x + s / 2, y + s / 2 + s * 0.02);
  }
  ctx.restore();
}
