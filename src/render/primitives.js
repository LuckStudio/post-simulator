/** Rectángulo redondeado (solo construye el path). */
export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Tamaño intrínseco de una imagen, vídeo o canvas. */
export function srcSize(img) {
  return [
    img.naturalWidth || img.videoWidth || img.width || 1,
    img.naturalHeight || img.videoHeight || img.height || 1,
  ];
}

/** Dibuja `img` cubriendo la caja (como object-fit: cover) con encuadre y zoom. */
export function drawCover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5, zoom = 1) {
  const [iw, ih] = srcSize(img);
  const sc = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * sc;
  const dh = ih * sc;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
  ctx.restore();
}

/** Dibuja `img` entera dentro de la caja (como object-fit: contain). */
export function drawContain(ctx, img, x, y, w, h) {
  const [iw, ih] = srcSize(img);
  const sc = Math.min(w / iw, h / ih);
  const dw = iw * sc;
  const dh = ih * sc;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Recorta un texto con "…" para que quepa en `w` con la fuente actual del contexto. */
export function ellip(ctx, t, w) {
  t = String(t || '');
  if (ctx.measureText(t).width <= w) return t;
  const a = Array.from(t);
  while (a.length && ctx.measureText(a.join('') + '…').width > w) a.pop();
  return a.join('') + '…';
}
