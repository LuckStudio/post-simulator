import JSZip from 'jszip';
import { renderSlideToCanvas } from '../render/carousel.js';
import { canvasToBlob, projectBaseName, saveFile, slideFileName } from '../io/files.js';

/** PNG de una slide. */
export async function exportSlidePng({ rc, slide, notify }) {
  const blob = await canvasToBlob(renderSlideToCanvas(rc, slide));
  await saveFile(`${projectBaseName(rc.state)}-${slideFileName(slide)}.png`, blob, notify);
}

/** Copia la slide como imagen al portapapeles. Lanza si el navegador no lo permite. */
export async function copySlideImage({ rc, slide }) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Tu navegador no permite copiar imágenes al portapapeles.');
  }
  const blob = await canvasToBlob(renderSlideToCanvas(rc, slide));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** ZIP con un PNG por slide. */
export async function exportAllPngZip({ rc, slides, notify }) {
  const zip = new JSZip();
  for (const sl of slides) zip.file(`${slideFileName(sl)}.png`, await canvasToBlob(renderSlideToCanvas(rc, sl)));
  await saveFile(`${projectBaseName(rc.state)}-carrusel.zip`, await zip.generateAsync({ type: 'blob' }), notify);
}
