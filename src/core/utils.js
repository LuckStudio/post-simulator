export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** Copia profunda de datos serializables (el estado del proyecto lo es por diseño). */
export const clone = (o) => JSON.parse(JSON.stringify(o));

const numberFormat = new Intl.NumberFormat('es-ES');
export const fmtN = (n) => numberFormat.format(Math.max(0, Math.round(n || 0)));

/** Convierte un texto en un nombre de archivo seguro. */
export function slug(s) {
  return (
    String(s || 'carrusel')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'carrusel'
  );
}

/** Lee una ruta tipo "a.b.0.c" de un objeto. */
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Escribe una ruta tipo "a.b.0.c" en un objeto (mutándolo). */
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys[keys.length - 1]] = value;
}
