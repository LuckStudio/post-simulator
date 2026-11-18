/**
 * Compartir con la hoja nativa del sistema (Instagram, WhatsApp, Fotos…) usando la Web Share API.
 * Funciona sobre todo en móvil; donde no hay soporte para archivos, el llamador descarga un ZIP.
 */

/** ¿Puede este navegador compartir estos archivos? */
export function canShareFiles(files, nav = globalThis.navigator) {
  try {
    return !!nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && !!nav.canShare({ files });
  } catch {
    return false;
  }
}

/** ¿Puede compartir imágenes PNG? (sin generar nada: sirve para decidir qué ofrecer en un menú). */
export function canShareImages(nav = globalThis.navigator) {
  try {
    return canShareFiles([new File([''], 'prueba.png', { type: 'image/png' })], nav);
  } catch {
    return false;
  }
}

/**
 * Comparte las slides como imágenes PNG.
 * @param {{slides:object[], renderBlob:(slide:object)=>Promise<Blob>, fileName:(slide:object)=>string,
 *          title?:string, nav?:Navigator}} o
 * @returns {Promise<{status:'shared'|'cancelled'|'unsupported'|'error', error?:unknown}>}
 */
export async function shareSlides({ slides, renderBlob, fileName, title, nav = globalThis.navigator }) {
  const files = [];
  for (const s of slides) files.push(new File([await renderBlob(s)], fileName(s), { type: 'image/png' }));
  if (!canShareFiles(files, nav)) return { status: 'unsupported' };
  try {
    await nav.share({ files, title });
    return { status: 'shared' };
  } catch (error) {
    // Cerrar la hoja de compartir sin elegir nada no es un error.
    if (error && error.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'error', error };
  }
}
