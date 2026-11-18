import { hexA } from '../../core/color.js';
import { ICON, strokeIcon } from '../icons.js';
import { rr } from '../primitives.js';
import { charCount, drawText, textMode, wrapText } from '../text.js';

/** Qué bloques van en cada slide de cierre según el modo elegido. */
const CTA_SETS = {
  both: [['seek', 'offer']],
  separate: [['seek'], ['offer']],
  seek: [['seek']],
  offer: [['offer']],
};

/**
 * Slides de cierre: "síguenos si buscas trabajo" y/o "escríbenos si ofreces un puesto".
 * Devuelve una o dos slides.
 */
export function ctaSlides(rc, G) {
  const C = rc.state.cta;
  const S = G.S;
  const t = rc.theme;
  const ac = rc.state.style.accent;
  const blocksByKey = {
    seek: { icon: ICON.bell, title: C.seekTitle, text: C.seekText, btn: C.seekBtn },
    offer: { icon: ICON.msg, title: C.offerTitle, text: C.offerText, btn: C.offerBtn },
  };
  const sets = CTA_SETS[C.mode] || CTA_SETS.offer;

  return sets.map((set, si) => {
    const two = set.length === 2;
    const pad = 56 * S;
    const innerW = G.cardW - 2 * pad;
    const sz = two ? { icon: 96 * S, title: 54 * S, text: 31 * S } : { icon: 124 * S, title: 68 * S, text: 36 * S };

    const blocks = set.map((k) => {
      const d = blocksByKey[k];
      const tl = wrapText(rc, d.title, innerW, sz.title, 700);
      const xl = wrapText(rc, d.text, innerW, sz.text, 400);
      const h =
        pad +
        sz.icon +
        32 * S +
        tl.length * sz.title * 1.15 +
        18 * S +
        xl.length * sz.text * 1.4 +
        36 * S +
        84 * S +
        (C.handle ? 50 * S : 0) +
        pad;
      return { d, tl, xl, h };
    });

    const gap = 32 * S;
    const total = blocks.reduce((a, b) => a + b.h, 0) + gap * (blocks.length - 1);
    let y = G.M + (G.maxH - total) / 2;

    const items = blocks.map((bk, bi) => {
      const sfx = bi ? '2' : '';
      const card = { key: 'card' + sfx, box: { x: G.cardX, y, w: G.cardW, h: bk.h }, children: [] };
      const cx = G.cardX + G.cardW / 2;
      let yy = y + pad;

      {
        const b = { x: cx - sz.icon / 2, y: yy, w: sz.icon, h: sz.icon };
        card.children.push({
          key: 'ctaIcon' + sfx,
          box: b,
          draw: (ctx) => {
            ctx.fillStyle = hexA(ac, rc.state.style.theme === 'dark' ? 0.22 : 0.12);
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, 7);
            ctx.fill();
            const is = b.w * 0.48;
            strokeIcon(ctx, bk.d.icon, b.x + (b.w - is) / 2, b.y + (b.h - is) / 2, is, ac, 2);
          },
        });
        yy += sz.icon + 32 * S;
      }
      {
        const lh = sz.title * 1.15;
        const b = { x: G.cardX + pad, y: yy, w: innerW, h: bk.tl.length * lh };
        card.children.push({
          key: 'ctaTitle' + sfx,
          box: b,
          chars: charCount(bk.tl),
          draw: (ctx, p, type) =>
            drawText(ctx, rc, bk.tl, {
              x: b.x,
              y: b.y,
              w: b.w,
              size: sz.title,
              lh,
              weight: 700,
              color: t.text,
              align: 'center',
              mode: textMode(type),
              p,
            }),
        });
        yy += b.h + 18 * S;
      }
      {
        const lh = sz.text * 1.4;
        const b = { x: G.cardX + pad, y: yy, w: innerW, h: bk.xl.length * lh };
        card.children.push({
          key: 'ctaText' + sfx,
          box: b,
          chars: charCount(bk.xl),
          draw: (ctx, p, type) =>
            drawText(ctx, rc, bk.xl, {
              x: b.x,
              y: b.y,
              w: b.w,
              size: sz.text,
              lh,
              color: t.muted,
              align: 'center',
              mode: textMode(type),
              p,
            }),
        });
        yy += b.h + 36 * S;
      }
      {
        const b = { x: G.cardX + pad, y: yy, w: innerW, h: 84 * S + (C.handle ? 50 * S : 0) };
        card.children.push({
          key: 'ctaButton' + sfx,
          box: b,
          draw: (ctx) => {
            ctx.font = rc.font(600, 30 * S);
            const lw = ctx.measureText(bk.d.btn).width;
            const bw = lw + 96 * S;
            const bx = cx - bw / 2;
            ctx.fillStyle = ac;
            rr(ctx, bx, b.y, bw, 84 * S, 42 * S);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(bk.d.btn, cx, b.y + 52 * S);
            if (C.handle) {
              ctx.font = rc.font(500, 26 * S);
              ctx.fillStyle = t.muted;
              ctx.fillText(C.handle, cx, b.y + 84 * S + 40 * S);
            }
            ctx.textAlign = 'left';
          },
        });
      }
      y += bk.h + gap;
      return card;
    });

    return { type: 'cta', label: sets.length > 1 ? `Cierre ${si + 1}` : 'Cierre', hasMedia: false, items };
  });
}
