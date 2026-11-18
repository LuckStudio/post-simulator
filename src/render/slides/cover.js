import { hexA } from '../../core/color.js';
import { clamp } from '../../core/utils.js';
import { EASE } from '../../animation/easing.js';
import { drawAvatar } from '../chrome.js';
import { ICON, strokeIcon } from '../icons.js';
import { drawCover, ellip, rr } from '../primitives.js';
import { charCount, drawText, textMode, wrapText } from '../text.js';

/**
 * Portada: etiqueta, puesto, empresa, detalles (ubicación, modalidad, contrato,
 * salario) y pie con autor e invitación a deslizar.
 * Dos diseños: 'card' (tarjeta con franja de imagen) y 'full' (imagen a sangre).
 */
export function coverSlide(rc, G) {
  const C = rc.state.cover;
  const S = G.S;
  const t = rc.theme;
  const ac = rc.state.style.accent;
  const full = C.layout === 'full';
  const items = [];
  const img = rc.assets.image(C.image);

  const rows = [
    ['pin', C.location],
    ['laptop', C.modality],
    ['case', C.contract],
    ['wallet', C.salary],
  ].filter((r) => String(r[1] || '').trim());

  const colors = full
    ? {
        text: '#fff',
        muted: 'rgba(255,255,255,0.8)',
        chip: 'rgba(255,255,255,0.18)',
        chipText: '#fff',
        line: 'rgba(255,255,255,0.3)',
        icon: 'rgba(255,255,255,0.85)',
      }
    : {
        text: t.text,
        muted: t.muted,
        chip: hexA(ac, rc.state.style.theme === 'dark' ? 0.2 : 0.1),
        chipText: ac,
        line: t.line,
        icon: ac,
      };

  const pad = full ? 0 : 60 * S;
  const contentW = full ? G.W - 2 * G.M - 20 * S : G.cardW - 2 * pad;
  const bandH = !full && C.image ? Math.min(G.cardW * 0.46, G.maxH * 0.34) : 0;
  const hasFooter = C.showAuthor || C.swipe;

  const measure = (rs) => {
    const roleLines = wrapText(rc, C.role, contentW, rs, 700);
    const compLines = C.company ? wrapText(rc, C.company, contentW, 34 * S, 500) : [];
    let h = 0;
    const pos = {};
    if (C.kicker) {
      pos.kicker = h;
      h += 56 * S + 34 * S;
    }
    pos.role = h;
    h += roleLines.length * rs * 1.1;
    if (compLines.length) {
      h += 18 * S;
      pos.company = h;
      h += compLines.length * 46 * S;
    }
    if (rows.length) {
      h += 40 * S;
      pos.meta = h;
      h += rows.length * 54 * S;
    }
    if (hasFooter) {
      h += 40 * S;
      pos.footer = h;
      h += 84 * S;
    }
    return { h, pos, roleLines, compLines };
  };

  // El puesto empieza grande y se reduce hasta que todo cabe (y ocupa como mucho 4 líneas).
  let rs = 92 * S;
  let ms = measure(rs);
  const avail = full ? G.H - 2 * G.M - 140 * S : G.maxH - bandH - 2 * pad;
  while (rs > 44 * S && (ms.h > avail || ms.roleLines.length > 4)) {
    rs -= 4 * S;
    ms = measure(rs);
  }

  let ox;
  let oy;
  let card = null;
  if (full) {
    items.push({
      key: 'coverImage',
      box: { x: 0, y: 0, w: G.W, h: G.H },
      draw: (ctx) => {
        if (img) drawCover(ctx, img, 0, 0, G.W, G.H);
        else {
          ctx.fillStyle = '#22313F';
          ctx.fillRect(0, 0, G.W, G.H);
        }
        const g = ctx.createLinearGradient(0, 0, 0, G.H);
        g.addColorStop(0, `rgba(0,0,0,${C.overlay * 0.35})`);
        g.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, C.overlay + 0.2)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, G.W, G.H);
      },
    });
    ox = G.M + 10 * S;
    oy = G.H - G.M - 90 * S - ms.h;
  } else {
    const ch = bandH + 2 * pad + ms.h;
    const cy = G.M + (G.maxH - ch) / 2;
    card = { key: 'card', box: { x: G.cardX, y: cy, w: G.cardW, h: ch }, children: [] };
    if (bandH) {
      const b = { x: G.cardX, y: cy, w: G.cardW, h: bandH };
      card.children.push({
        key: 'coverImage',
        box: b,
        draw: (ctx) => {
          if (img) drawCover(ctx, img, b.x, b.y, b.w, b.h);
        },
      });
    }
    ox = G.cardX + pad;
    oy = cy + bandH + pad;
    items.push(card);
  }

  const push = (it) => (card ? card.children : items).push(it);
  const P = ms.pos;

  if (C.kicker) {
    const b = { x: ox, y: oy + P.kicker, w: contentW, h: 56 * S };
    push({
      key: 'kicker',
      box: b,
      draw: (ctx) => {
        ctx.font = rc.font(600, 26 * S);
        const w = ctx.measureText(C.kicker).width + 48 * S;
        b.w = w;
        ctx.fillStyle = colors.chip;
        rr(ctx, b.x, b.y, w, b.h, b.h / 2);
        ctx.fill();
        ctx.fillStyle = colors.chipText;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillText(C.kicker, b.x + 24 * S, b.y + 37 * S);
      },
    });
  }

  {
    const lh = rs * 1.1;
    const b = { x: ox, y: oy + P.role, w: contentW, h: ms.roleLines.length * lh };
    push({
      key: 'role',
      box: b,
      chars: charCount(ms.roleLines),
      draw: (ctx, p, type) =>
        drawText(ctx, rc, ms.roleLines, {
          x: b.x,
          y: b.y,
          w: b.w,
          size: rs,
          lh,
          weight: 700,
          color: colors.text,
          mode: textMode(type),
          p,
        }),
    });
  }

  if (ms.compLines.length) {
    const b = { x: ox, y: oy + P.company, w: contentW, h: ms.compLines.length * 46 * S };
    push({
      key: 'company',
      box: b,
      chars: charCount(ms.compLines),
      draw: (ctx, p, type) =>
        drawText(ctx, rc, ms.compLines, {
          x: b.x,
          y: b.y,
          w: b.w,
          size: 34 * S,
          lh: 46 * S,
          weight: 500,
          color: colors.muted,
          mode: textMode(type),
          p,
        }),
    });
  }

  if (rows.length) {
    const b = { x: ox, y: oy + P.meta, w: contentW, h: rows.length * 54 * S };
    push({
      key: 'meta',
      box: b,
      chars: rows.reduce((a, r) => a + String(r[1]).length, 0),
      draw: (ctx, p, type) => drawMetaRows(ctx, rc, rows, b, p, type, colors),
    });
  }

  if (hasFooter) {
    const b = { x: ox, y: oy + P.footer, w: contentW, h: 84 * S };
    push({
      key: 'coverFooter',
      box: b,
      draw: (ctx) => {
        ctx.fillStyle = colors.line;
        ctx.fillRect(b.x, b.y, b.w, 2 * S);
        const cy = b.y + 20 * S + 32 * S;
        ctx.textBaseline = 'alphabetic';
        if (C.showAuthor) {
          drawAvatar(ctx, rc, b.x, b.y + 20 * S, 64 * S);
          ctx.font = rc.font(600, 28 * S);
          ctx.fillStyle = colors.text;
          ctx.textAlign = 'left';
          ctx.fillText(ellip(ctx, rc.state.author.name, b.w * 0.45), b.x + 84 * S, cy + 10 * S);
        }
        if (C.swipe) {
          ctx.font = rc.font(600, 26 * S);
          ctx.fillStyle = full ? '#fff' : ac;
          ctx.textAlign = 'right';
          const ax = b.x + b.w - 34 * S;
          ctx.fillText(C.swipe, ax - 12 * S, cy + 9 * S);
          ctx.textAlign = 'left';
          strokeIcon(ctx, ICON.arrow, ax, cy - 17 * S, 34 * S, full ? '#fff' : ac, 2.2);
        }
      },
    });
  }

  return { type: 'cover', label: 'Portada', hasMedia: false, items };
}

/** Filas de detalles con icono. Admiten animación por líneas, palabras o máquina de escribir. */
function drawMetaRows(ctx, rc, rows, b, p, type, colors) {
  const S = rc.S;
  rows.forEach((r, i) => {
    ctx.save();
    const y = b.y + i * 54 * S;
    if (type === 'lines' || type === 'words') {
      const st = rows.length > 1 ? (i / rows.length) * 0.6 : 0;
      const e = EASE.outCubic(clamp((p - st) / 0.4));
      ctx.globalAlpha *= e;
      ctx.translate((1 - e) * 40 * S, 0);
    }
    strokeIcon(ctx, ICON[r[0]], b.x, y + 8 * S, 32 * S, colors.icon, 1.9);
    ctx.font = rc.font(400, 30 * S);
    ctx.fillStyle = colors.text;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    let txt = ellip(ctx, r[1], b.w - 52 * S);
    if (type === 'typewriter') {
      const st = i / rows.length;
      const en = (i + 1) / rows.length;
      const k = clamp((p - st) / (en - st));
      const a = Array.from(txt);
      txt = a.slice(0, Math.floor(k * a.length)).join('');
    }
    ctx.fillText(txt, b.x + 52 * S, y + 35 * S);
    ctx.restore();
  });
}
