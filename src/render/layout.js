import { hasMedia, mediaNaturalHeight } from './media.js';
import { trimBlank, truncateMore, wrapText } from './text.js';

/** Interlineado del texto del post, relativo al tamaño de letra. */
export const POST_LINE_HEIGHT = 1.42;

/**
 * Geometría común a todas las slides: márgenes, tarjeta y espacio útil.
 * @typedef {ReturnType<typeof postGeometry>} Geometry
 */
export function postGeometry(rc) {
  const { W, H, S, state } = rc;
  const st = state.style;
  const M = st.margin * S;
  const footSpace = st.pager || st.footerHandle ? 56 * S : 0;
  const cardW = Math.min(W - 2 * M, 1180 * S);
  const cardX = (W - cardW) / 2;
  const maxH = H - 2 * M - footSpace;
  const pad = 40 * S;
  const statsH = state.stats.show ? 72 * S : 0;
  const actH = state.stats.actions ? 100 * S : 0;
  return { W, H, S, M, cardW, cardX, maxH, pad, innerW: cardW - 2 * pad, statsH, actH };
}

/**
 * Apila verticalmente las partes de una tarjeta de post y devuelve la posición
 * (relativa al borde superior de la tarjeta) de cada una y el alto total `h`.
 */
export function stackPost(G, o) {
  const S = G.S;
  let y = 0;
  const pos = {};
  if (o.header) {
    y += 28 * S;
    pos.header = y;
    y += 104 * S;
  }
  if (o.nLines) {
    y += o.header ? 22 * S : 44 * S;
    pos.text = y;
    y += o.nLines * o.lh;
    y += 28 * S;
  } else if (o.header) y += 24 * S;
  if (o.mediaH) {
    pos.media = y;
    y += o.mediaH;
  }
  if (o.footer) {
    if (G.statsH) {
      pos.stats = y;
      y += G.statsH;
    }
    if (G.actH) {
      pos.actions = y;
      y += G.actH;
    }
  } else if (!o.mediaH) y += 12 * S;
  pos.h = y;
  return pos;
}

/**
 * Reparte el texto del post en páginas (slides) según el modo de ajuste:
 * - 'split': corta por párrafos en tantas slides como haga falta;
 * - 'auto': busca el mayor tamaño que cabe en una slide;
 * - 'manual': tamaño fijo, con "… más" opcional.
 *
 * @typedef {{header:boolean, lines:import('./text.js').Line[], size:number,
 *            mediaH:number, footer:boolean, more:boolean}} PostPage
 * @returns {PostPage[]}
 */
export function buildPostPages(rc, G) {
  const P = rc.state.post;
  const S = G.S;
  const mi = hasMedia(rc) ? mediaNaturalHeight(rc, G.cardW) : 0;

  const singlePage = (sz, mH, isAuto) => {
    const lh = sz * POST_LINE_HEIGHT * S;
    let lines = trimBlank(wrapText(rc, P.text, G.innerW, sz * S, 400, true));
    const g = stackPost(G, { header: 1, nLines: 1, lh: 0, mediaH: mH, footer: 1 }).h;
    let nMax = Math.max(1, Math.floor((G.maxH - g) / lh));
    if (!isAuto && P.more) nMax = Math.min(nMax, P.moreLines);
    let more = false;
    if (lines.length > nMax) {
      lines = truncateMore(rc, trimBlank(lines.slice(0, nMax)), G.innerW, sz * S);
      more = true;
    }
    return { header: true, lines, size: sz, mediaH: mH, footer: true, more };
  };

  if (P.fit === 'auto') {
    const mH = mi ? Math.min(mi, G.maxH * 0.5) : 0;
    for (let size = P.autoMax; size >= P.autoMin; size -= 1) {
      const lh = size * POST_LINE_HEIGHT;
      const lines = trimBlank(wrapText(rc, P.text, G.innerW, size * S, 400, true));
      if (stackPost(G, { header: 1, nLines: lines.length, lh: lh * S, mediaH: mH, footer: 1 }).h <= G.maxH) {
        return [{ header: true, lines, size, mediaH: mH, footer: true, more: false }];
      }
    }
    return [singlePage(P.autoMin, mH, true)];
  }

  if (P.fit === 'manual') {
    const mH = mi ? Math.min(mi, G.maxH * 0.55) : 0;
    return [singlePage(P.size, mH, false)];
  }

  return splitPages(rc, G, mi);
}

function splitPages(rc, G, mi) {
  const P = rc.state.post;
  const S = G.S;
  const size = P.size;
  const lh = size * POST_LINE_HEIGHT * S;
  const lines = trimBlank(wrapText(rc, P.text, G.innerW, size * S, 400, true));
  const tailMH = mi ? Math.min(mi, G.maxH * 0.55) : 0;
  const pages = [];
  let cur = null;

  const newPage = () => {
    cur = {
      header: pages.length === 0 || P.repeatHeader,
      lines: [],
      size,
      mediaH: 0,
      footer: P.footerEvery,
      more: false,
    };
    pages.push(cur);
  };
  const fits = (pg, add, tail) =>
    stackPost(G, {
      header: pg.header,
      nLines: pg.lines.length + add,
      lh,
      mediaH: tail ? tailMH : 0,
      footer: tail ? true : pg.footer,
    }).h <= G.maxH;

  for (const ln of lines) {
    if (!cur) newPage();
    if (!cur.lines.length && !ln.words.length) continue;
    if (fits(cur, 1, false)) {
      cur.lines.push(ln);
      continue;
    }
    // No cabe: si hay un salto de párrafo cerca del final, se lleva ese párrafo entero a la siguiente slide.
    let carry = [];
    for (let j = cur.lines.length - 1; j >= Math.max(2, cur.lines.length - 4); j--) {
      if (!cur.lines[j].words.length) {
        carry = cur.lines.splice(j);
        break;
      }
    }
    newPage();
    carry = trimBlank(carry);
    cur.lines.push(...carry);
    if (ln.words.length || cur.lines.length) cur.lines.push(ln);
  }
  if (!cur) newPage();

  // La última página lleva la multimedia y las reacciones; si no caben, se añade otra.
  if (fits(cur, 0, true)) {
    cur.mediaH = tailMH;
    cur.footer = true;
  } else {
    const prev = cur;
    newPage();
    cur.footer = true;
    if (mi) {
      cur.mediaH = Math.min(
        mi,
        G.maxH - stackPost(G, { header: cur.header, nLines: 0, lh, mediaH: 0, footer: true }).h,
      );
    } else {
      const move = [];
      while (move.length < 3 && prev.lines.length > 2) {
        const l = prev.lines.pop();
        if (l.words.length) move.unshift(l);
      }
      cur.lines = trimBlank(move);
    }
  }
  pages.forEach((p) => {
    p.lines = trimBlank(p.lines);
  });
  return pages.filter((p) => p.lines.length || p.mediaH || p.footer);
}
