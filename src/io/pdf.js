import { PDFJS_BASE } from '../core/constants.js';
import { loadScript } from './files.js';

const MAX_PAGES = 30;

/** Carga pdf.js desde cdnjs solo cuando hace falta. */
async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadScript(PDFJS_BASE + 'pdf.worker.min.js');
  await loadScript(PDFJS_BASE + 'pdf.min.js');
  const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
  lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
  return lib;
}

/**
 * Convierte las páginas de un PDF en imágenes JPEG (dataURL) de 1400 px de ancho.
 * @returns {Promise<{pages:string[], truncated:boolean}>}
 */
export async function pdfToImages(file) {
  const lib = await ensurePdfJs();
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  const n = Math.min(doc.numPages, MAX_PAGES);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const vp0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 1400 / vp0.width });
    const c = document.createElement('canvas');
    c.width = vp.width;
    c.height = vp.height;
    const cx = c.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: cx, viewport: vp }).promise;
    pages.push(c.toDataURL('image/jpeg', 0.88));
  }
  return { pages, truncated: doc.numPages > MAX_PAGES };
}
