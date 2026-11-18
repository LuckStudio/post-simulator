import JSZip from 'jszip';
import { renderSlideToCanvas } from '../render/carousel.js';
import { canvasToBlob, projectBaseName, saveFile, slideFileName } from '../io/files.js';

/** PNG de una slide. */
export async function exportSlidePng({ rc, slide, notify }) {
  const blob = await canvasToBlob(renderSlideToCanvas(rc, slide));
  await saveFile(`${projectBaseName(rc.state)}-${slideFileName(slide)}.png`, blob, notify);
}

/** ZIP con un PNG por slide. */
export async function exportAllPngZip({ rc, slides, notify }) {
  const zip = new JSZip();
  for (const sl of slides) zip.file(`${slideFileName(sl)}.png`, await canvasToBlob(renderSlideToCanvas(rc, sl)));
  await saveFile(`${projectBaseName(rc.state)}-carrusel.zip`, await zip.generateAsync({ type: 'blob' }), notify);
}
