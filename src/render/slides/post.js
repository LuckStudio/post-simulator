import { REACTIONS } from '../../core/constants.js';
import { fmtN } from '../../core/utils.js';
import { EASE } from '../../animation/easing.js';
import { drawAvatar } from '../chrome.js';
import { ICON, fillGlyph, strokeIcon } from '../icons.js';
import { POST_LINE_HEIGHT, stackPost } from '../layout.js';
import { drawMedia } from '../media.js';
import { ellip } from '../primitives.js';
import { charCount, drawText, textMode } from '../text.js';

/** Construye una slide de post a partir de una página calculada en layout.js. */
export function postSlide(rc, pg, G, i, n) {
  const S = G.S;
  const t = rc.theme;
  const ac = rc.state.style.accent;
  const lh = pg.size * POST_LINE_HEIGHT * S;
  const pos = stackPost(G, { header: pg.header, nLines: pg.lines.length, lh, mediaH: pg.mediaH, footer: pg.footer });
  const cy = G.M + (G.maxH - pos.h) / 2;
  const card = { key: 'card', box: { x: G.cardX, y: cy, w: G.cardW, h: pos.h }, children: [] };

  if (pg.header) {
    const b = { x: G.cardX + G.pad, y: cy + pos.header, w: G.innerW, h: 104 * S };
    card.children.push({ key: 'header', box: b, draw: (ctx) => drawHeader(ctx, rc, b) });
  }
  if (pg.lines.length) {
    const b = { x: G.cardX + G.pad, y: cy + pos.text, w: G.innerW, h: pg.lines.length * lh };
    card.children.push({
      key: 'text',
      box: b,
      chars: charCount(pg.lines),
      draw: (ctx, p, type) =>
        drawText(ctx, rc, pg.lines, {
          x: b.x,
          y: b.y,
          w: b.w,
          size: pg.size * S,
          lh,
          color: t.text,
          accent: ac,
          mode: textMode(type),
          p,
          more: pg.more,
          moreColor: t.muted,
        }),
    });
  }
  if (pg.mediaH) {
    const b = { x: G.cardX, y: cy + pos.media, w: G.cardW, h: pg.mediaH };
    card.children.push({ key: 'media', box: b, draw: (ctx, p, type, lt) => drawMedia(ctx, rc, b, lt) });
  }
  if (pg.footer && G.statsH) {
    const b = { x: G.cardX + G.pad, y: cy + pos.stats, w: G.innerW, h: G.statsH };
    card.children.push({
      key: 'stats',
      box: b,
      draw: (ctx, p, type) => drawStats(ctx, rc, b, type === 'count-up' ? EASE.outCubic(p) : 1),
    });
  }
  if (pg.footer && G.actH) {
    const b = { x: G.cardX, y: cy + pos.actions, w: G.cardW, h: G.actH };
    card.children.push({ key: 'actions', box: b, draw: (ctx) => drawActions(ctx, rc, b) });
  }
  return { type: 'post', label: n > 1 ? `Post ${i + 1}` : 'Post', hasMedia: pg.mediaH > 0, items: [card] };
}

function drawHeader(ctx, rc, b) {
  const { S, theme: t } = rc;
  const A = rc.state.author;
  const ac = rc.state.style.accent;
  const av = 104 * S;
  drawAvatar(ctx, rc, b.x, b.y, av);
  const tx = b.x + av + 22 * S;
  let right = b.x + b.w;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (A.follow) {
    ctx.font = rc.font(600, 30 * S);
    const l = '+ Seguir';
    const lw = ctx.measureText(l).width;
    ctx.fillStyle = ac;
    ctx.fillText(l, right - lw, b.y + 44 * S);
    right -= lw + 28 * S;
  }
  const mw = right - tx;
  ctx.fillStyle = t.text;
  ctx.font = rc.font(600, 32 * S);
  ctx.fillText(ellip(ctx, A.name, mw), tx, b.y + 36 * S);
  ctx.fillStyle = t.muted;
  ctx.font = rc.font(400, 25 * S);
  ctx.fillText(ellip(ctx, A.headline, mw), tx, b.y + 69 * S);
  ctx.font = rc.font(400, 24 * S);
  const tt = (A.time || '') + (A.globe ? ' • ' : '');
  ctx.fillText(tt, tx, b.y + 100 * S);
  if (A.globe) strokeIcon(ctx, ICON.globe, tx + ctx.measureText(tt).width, b.y + 80 * S, 23 * S, t.muted, 2);
}

/** Fila de reacciones y contadores. `k` ∈ [0,1] anima los números (contador). */
function drawStats(ctx, rc, b, k) {
  const { S, theme: t } = rc;
  const st = rc.state.stats;
  const cy = b.y + b.h / 2;
  const d = 36 * S;
  const types = st.types.slice(0, 3);
  let x = b.x;
  types.forEach((ty, i) => {
    const cx = b.x + d / 2 + i * (d - 10 * S);
    ctx.fillStyle = t.card;
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2 + 3 * S, 0, 7);
    ctx.fill();
    ctx.fillStyle = (REACTIONS[ty] || REACTIONS.like).c;
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2, 0, 7);
    ctx.fill();
    fillGlyph(ctx, ty, cx, cy, d * 0.66);
  });
  if (types.length) x += d + (types.length - 1) * (d - 10 * S) + 12 * S;
  ctx.font = rc.font(400, 25 * S);
  ctx.fillStyle = t.muted;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (st.reactions > 0) ctx.fillText(fmtN(st.reactions * k), x, cy + 9 * S);
  const parts = [];
  const c = Math.round(st.comments * k);
  const r = Math.round(st.reposts * k);
  if (st.comments > 0) parts.push(`${fmtN(c)} ${st.comments === 1 ? 'comentario' : 'comentarios'}`);
  if (st.reposts > 0) parts.push(`${fmtN(r)} ${st.reposts === 1 ? 'vez compartido' : 'veces compartido'}`);
  ctx.textAlign = 'right';
  ctx.fillText(parts.join(' · '), b.x + b.w, cy + 9 * S);
  ctx.textAlign = 'left';
  if (st.actions) {
    ctx.fillStyle = t.line;
    ctx.fillRect(b.x, b.y + b.h - 2 * S, b.w, 2 * S);
  }
}

const ACTION_ICONS = [ICON.thumb, ICON.comment, ICON.repost, ICON.send];

function drawActions(ctx, rc, b) {
  const { S, theme: t } = rc;
  const labels = rc.state.stats.labels;
  const pad = 16 * S;
  const cw = (b.w - 2 * pad) / 4;
  ctx.font = rc.font(600, 26 * S);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (let i = 0; i < 4; i++) {
    const lbl = labels[i] || '';
    const lw = lbl ? ctx.measureText(lbl).width : 0;
    const is = 34 * S;
    const tw = is + (lbl ? 12 * S + lw : 0);
    const x = b.x + pad + i * cw + (cw - tw) / 2;
    const cy = b.y + b.h / 2;
    strokeIcon(ctx, ACTION_ICONS[i], x, cy - is / 2, is, t.muted, 1.9);
    if (lbl) {
      ctx.fillStyle = t.muted;
      ctx.fillText(lbl, x + is + 12 * S, cy + 9 * S);
    }
  }
}
