import { clone } from '../core/utils.js';

export const DEFAULT_PROJECT_NAME = 'Proyecto sin título';
const MAX_NAME = 80;

/**
 * @typedef {object} ProjectMeta
 * @property {string} id
 * @property {string} name
 * @property {number} createdAt   ms desde 1970
 * @property {number} updatedAt
 * @property {string} format      proporción (p. ej. "4:5")
 * @property {number} slides      nº de slides del carrusel
 * @property {boolean} hasVideo   si hay un vídeo guardado para el proyecto
 * @property {string|null} thumb  miniatura de la primera slide (dataURL), si hay
 * @property {{template:string, step:number}|null} [guide]  modo guiado en curso (plantilla y paso), si lo hay
 */

/** Nombre inicial razonable a partir del contenido: título de la portada, autor o uno genérico. */
export function defaultProjectName(state) {
  const raw = (state?.cover?.on && state.cover.role) || state?.author?.name || '';
  return cleanName(raw) || DEFAULT_PROJECT_NAME;
}

/** Recorta espacios y largo; un nombre vacío queda vacío (quien llama decide el sustituto). */
export function cleanName(name) {
  return String(name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
}

/**
 * Un nombre que no choque con los existentes: «Base», «Base 2», «Base 3»…
 * Para copias: pasa «X (copia)» y se obtiene «X (copia)», «X (copia 2)»… con `suffixed`.
 */
export function uniqueName(base, taken, { copy = false } = {}) {
  const used = new Set(taken.map((n) => n.toLowerCase()));
  const make = (n) => (copy ? (n === 1 ? `${base} (copia)` : `${base} (copia ${n})`) : n === 1 ? base : `${base} ${n}`);
  let n = 1;
  while (used.has(make(n).toLowerCase())) n++;
  return make(n);
}

/** Deja `{ template, step }` con tipos correctos; algo que no lo sea, `null`. */
export function cleanGuide(g) {
  if (!g || typeof g.template !== 'string' || !g.template) return null;
  const step = Number.isInteger(g.step) && g.step >= 0 ? g.step : 0;
  return { template: g.template, step };
}

function defaultUid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Biblioteca de proyectos sobre un backend de almacenamiento (ver `projectsDb.js`).
 * Cada proyecto tiene un único vídeo opcional, guardado como Blob con el mismo `id`.
 * Todo es asíncrono. Las operaciones sobre un proyecto que ya no existe devuelven `null`.
 */
export function createProjects(backend, { now = Date.now, uid = defaultUid } = {}) {
  const metaOf = (state, base, extra = {}) => ({
    thumb: null,
    slides: 1,
    hasVideo: false,
    ...base,
    ...extra,
    format: state.format,
  });

  return {
    /** Metadatos de todos los proyectos, el más reciente primero. */
    async list() {
      const all = await backend.all('meta');
      return all.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    },

    async count() {
      return (await backend.all('meta')).length;
    },

    getMeta: (id) => backend.get('meta', id).then((m) => m ?? null),

    /**
     * Crea un proyecto nuevo.
     * @param {{name?:string, state:object, video?:{blob:Blob, name?:string}|null, slides?:number, thumb?:string|null}} o
     * @returns {Promise<ProjectMeta>}
     */
    async create({ name, state, video = null, slides, thumb, guide = null }) {
      const t = now();
      const id = uid();
      const taken = (await backend.all('meta')).map((m) => m.name);
      const meta = metaOf(
        state,
        { id, name: uniqueName(cleanName(name) || defaultProjectName(state), taken), createdAt: t, updatedAt: t },
        {
          hasVideo: !!video,
          ...(slides ? { slides } : {}),
          ...(thumb !== undefined ? { thumb } : {}),
          ...(guide ? { guide: cleanGuide(guide) } : {}),
        },
      );
      const ops = [
        { op: 'put', store: 'meta', value: meta },
        { op: 'put', store: 'data', value: { id, state: clone(state) } },
      ];
      if (video) ops.push({ op: 'put', store: 'blobs', value: { id, blob: video.blob, name: video.name ?? '' } });
      await backend.batch(ops);
      return meta;
    },

    /** Lee el proyecto entero: metadatos, estado y vídeo (o null si no tiene). */
    async load(id) {
      const [meta, data, blob] = await Promise.all([
        backend.get('meta', id),
        backend.get('data', id),
        backend.get('blobs', id),
      ]);
      if (!meta || !data) return null;
      return { meta, state: data.state, video: blob ? { blob: blob.blob, name: blob.name } : null };
    },

    /**
     * Guarda el estado de un proyecto existente (autoguardado). `extra` puede traer `slides` y `thumb`.
     * No recrea un proyecto que se haya eliminado entretanto.
     */
    async save(id, state, extra = {}) {
      const prev = await backend.get('meta', id);
      if (!prev) return null;
      const meta = metaOf(
        state,
        { ...prev, updatedAt: now() },
        {
          ...(extra.slides ? { slides: extra.slides } : {}),
          ...(extra.thumb !== undefined ? { thumb: extra.thumb } : {}),
        },
      );
      await backend.batch([
        { op: 'put', store: 'meta', value: meta },
        { op: 'put', store: 'data', value: { id, state: clone(state) } },
      ]);
      return meta;
    },

    /** Cambia el nombre; uno vacío conserva el actual. */
    async rename(id, name) {
      const prev = await backend.get('meta', id);
      if (!prev) return null;
      const clean = cleanName(name);
      if (!clean || clean === prev.name) return prev;
      const meta = { ...prev, name: clean, updatedAt: now() };
      await backend.batch([{ op: 'put', store: 'meta', value: meta }]);
      return meta;
    },

    /** Copia un proyecto (estado y vídeo incluidos) con un id nuevo. */
    async duplicate(id, name) {
      const src = await this.load(id);
      if (!src) return null;
      const t = now();
      const newId = uid();
      const taken = (await backend.all('meta')).map((m) => m.name);
      const meta = {
        ...src.meta,
        id: newId,
        name: cleanName(name) || uniqueName(src.meta.name, taken, { copy: true }),
        createdAt: t,
        updatedAt: t,
      };
      const ops = [
        { op: 'put', store: 'meta', value: meta },
        { op: 'put', store: 'data', value: { id: newId, state: clone(src.state) } },
      ];
      if (src.video) ops.push({ op: 'put', store: 'blobs', value: { id: newId, ...src.video } });
      await backend.batch(ops);
      return meta;
    },

    /** Elimina el proyecto y su vídeo. */
    async remove(id) {
      const prev = await backend.get('meta', id);
      if (!prev) return false;
      await backend.batch([
        { op: 'del', store: 'meta', id },
        { op: 'del', store: 'data', id },
        { op: 'del', store: 'blobs', id },
      ]);
      return true;
    },

    /** Guarda (o sustituye) el vídeo del proyecto. */
    async setVideo(id, blob, name = '') {
      const prev = await backend.get('meta', id);
      if (!prev) return null;
      const meta = { ...prev, hasVideo: true, updatedAt: now() };
      await backend.batch([
        { op: 'put', store: 'blobs', value: { id, blob, name } },
        { op: 'put', store: 'meta', value: meta },
      ]);
      return meta;
    },

    /** Guarda el avance del modo guiado (o lo quita con `null`). No cuenta como edición. */
    async setGuide(id, guide) {
      const prev = await backend.get('meta', id);
      if (!prev) return null;
      const { guide: _old, ...rest } = prev;
      const clean = cleanGuide(guide);
      const meta = clean ? { ...rest, guide: clean } : rest;
      await backend.batch([{ op: 'put', store: 'meta', value: meta }]);
      return meta;
    },

    /** Quita el vídeo guardado del proyecto, si lo hay. */
    async clearVideo(id) {
      const prev = await backend.get('meta', id);
      if (!prev || !prev.hasVideo) return prev ?? null;
      const meta = { ...prev, hasVideo: false };
      await backend.batch([
        { op: 'del', store: 'blobs', id },
        { op: 'put', store: 'meta', value: meta },
      ]);
      return meta;
    },
  };
}
