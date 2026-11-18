/**
 * Iconos propios en una rejilla de 24×24 (trazos). No reproducen iconos de ninguna marca.
 */
export const ICON = {
  thumb:
    'M7 10.5v9.5H4.5A1.5 1.5 0 0 1 3 18.5V12a1.5 1.5 0 0 1 1.5-1.5H7zm0 0 4.2-7.2a1.8 1.8 0 0 1 3.2 1.5L13.5 9H19a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.6 20H7',
  comment: 'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  repost: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  send: 'M21.5 2.5 10.5 13.5M21.5 2.5 15 21l-4.5-7.5L3 9l18.5-6.5z',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9S9.5 5.6 12 3z',
  pin: 'M12 21.5s-7-6.6-7-12a7 7 0 0 1 14 0c0 5.4-7 12-7 12zM12 12a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z',
  laptop: 'M4 5h16v10H4zM2 19h20',
  case: 'M3 8h18v12H3zM8.5 8V5h7v3M3 13h18',
  wallet: 'M4 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4zM4 6V5a1 1 0 0 1 1-1h11M15.5 13h2',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9zM10 20.5a2.2 2.2 0 0 0 4 0',
  msg: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1zM8 10h8M8 13.5h5',
  arrow: 'M4 12h15M13 6l6 6-6 6',
};

/** Glifos rellenos para las burbujas de reacción. */
export const GLYPH = {
  like: 'M7 11v8.5H5A1.5 1.5 0 0 1 3.5 18v-5.5A1.5 1.5 0 0 1 5 11h2zm1.6 0 3.4-6.6c1.2 0 2.3 1 2 2.5L13.4 10h4.7a1.9 1.9 0 0 1 1.9 2.3l-1.2 5.6a1.9 1.9 0 0 1-1.9 1.6H8.6z',
  love: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  idea: 'M12 3a6 6 0 0 0-3.6 10.8V16h7.2v-2.2A6 6 0 0 0 12 3zM9.4 17.6h5.2V20H9.4z',
};

const pathCache = new Map();
function path2d(d) {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/** Dibuja un icono de trazo con la esquina superior izquierda en (x, y). */
export function strokeIcon(ctx, d, x, y, size, color, lw = 1.8) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke(path2d(d));
  ctx.restore();
}

/** Dibuja un glifo de reacción blanco centrado en (cx, cy) con diámetro d. */
export function fillGlyph(ctx, type, cx, cy, d) {
  ctx.save();
  ctx.translate(cx - d / 2, cy - d / 2);
  ctx.scale(d / 24, d / 24);
  ctx.fillStyle = '#fff';
  if (type === 'smile') {
    ctx.beginPath();
    ctx.arc(9, 10, 1.6, 0, 7);
    ctx.arc(15, 10, 1.6, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.arc(12, 12.5, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else ctx.fill(path2d(GLYPH[type] || GLYPH.like));
  ctx.restore();
}
