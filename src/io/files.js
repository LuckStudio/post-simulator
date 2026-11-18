import { slug } from '../core/utils.js';

/**
 * Guarda un archivo. Dentro de claude.ai usa la capacidad `downloads` del artifact;
 * fuera, un enlace de descarga normal.
 */
const downloadsPromise =
  typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function'
    ? window.claude.use('downloads').catch(() => null)
    : Promise.resolve(null);

/**
 * @param {string} name
 * @param {Blob|string} data
 * @param {(msg:string, isError?:boolean) => void} notify
 */
export async function saveFile(name, data, notify = () => {}) {
  const downloads = await downloadsPromise;
  if (downloads) {
    try {
      await downloads.save({ filename: name, data });
      notify('Archivo listo: ' + name);
    } catch (e) {
      if (e && e.code === 'declined') return;
      if (e && e.code === 'rate_limited') {
        notify('Hay una descarga pendiente de confirmar. Inténtalo en unos segundos.', true);
        return;
      }
      notify('No se pudo guardar el archivo (' + ((e && e.code) || 'error') + ').', true);
    }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  notify('Descargando ' + name);
}

/** Nombre base de los archivos exportados: el título de la portada (si hay) o el nombre del autor. */
export const projectBaseName = (state) =>
  slug((state.cover.on && state.cover.role) || state.author.name || 'publicacion');

/** "01-portada", "02-post-1"… */
export const slideFileName = (slide) => `${String(slide.index + 1).padStart(2, '0')}-${slug(slide.label)}`;

export const canvasToBlob = (c, type = 'image/png', q) => new Promise((r) => c.toBlob(r, type, q));

export function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('No se pudo cargar ' + src));
    document.head.append(s);
  });
}
