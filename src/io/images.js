import { MAX_IMAGE_SIDE } from '../core/constants.js';
import { readAsDataURL } from './files.js';

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/**
 * Lee una imagen subida como dataURL, reduciéndola si su lado largo supera `max`
 * o si pesa demasiado (para que el proyecto quepa en localStorage).
 */
export async function readImage(file, max = MAX_IMAGE_SIDE) {
  const url = await readAsDataURL(file);
  const im = await loadImage(url);
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const sc = Math.min(1, max / Math.max(w, h));
  if (sc === 1 && file.size < 1.6e6) return url;
  const c = document.createElement('canvas');
  c.width = Math.round(w * sc);
  c.height = Math.round(h * sc);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
}

export async function readImages(files, max) {
  const out = [];
  for (const f of files) out.push(await readImage(f, max));
  return out;
}
