import { APP_ID, PRESETS_KEY } from '../core/constants.js';
import { clone } from '../core/utils.js';
import { UserError } from '../core/errors.js';
import { deepMerge, hydrate } from './store.js';

/**
 * Presets: conjuntos de ajustes con nombre que se guardan en este navegador (localStorage)
 * y se pueden exportar e importar como JSON. Un preset guarda solo las secciones elegidas,
 * nunca el contenido de la oferta (texto del post, multimedia).
 *
 * @typedef {object} Preset
 * @property {string} id
 * @property {string} name
 * @property {string[]} sections  Claves de PRESET_SECTIONS incluidas.
 * @property {object} data        Fragmento del estado: { format?, style?, author?, anim?, … }.
 * @property {number} createdAt
 * @property {number} updatedAt
 *
 * @typedef {{v:number, items:Preset[], defaultId:string|null}} Library
 */

/** Secciones que puede incluir un preset: etiqueta y claves del estado que abarca. */
export const PRESET_SECTIONS = {
  style: { label: 'Estilo y formato', keys: ['format', 'style'] },
  author: { label: 'Autor y avatar', keys: ['author'] },
  anim: { label: 'Animación', keys: ['anim'] },
  stats: { label: 'Reacciones', keys: ['stats'] },
  cta: { label: 'Cierre', keys: ['cta'] },
  cover: { label: 'Portada', keys: ['cover'] },
};

/** Secciones marcadas por defecto al guardar un preset. */
export const DEFAULT_SECTIONS = ['style', 'author', 'anim', 'stats', 'cta'];

const MAX_NAME = 60;
const MAX_PRESETS = 200;
const FILE_KIND = 'presets';

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const knownSections = (list) => [...new Set((Array.isArray(list) ? list : []).filter((s) => s in PRESET_SECTIONS))];
const cleanName = (name) =>
  String(name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);

export function makeId(now = Date.now(), rnd = Math.random) {
  return 'p_' + now.toString(36) + rnd().toString(36).slice(2, 7);
}

/** Copia del fragmento del estado que corresponde a las secciones. */
export function capturePreset(state, sections) {
  const data = {};
  for (const s of knownSections(sections)) {
    for (const key of PRESET_SECTIONS[s].keys) if (key in state) data[key] = clone(state[key]);
  }
  return data;
}

/** @returns {Preset} */
export function createPreset({ name, state, sections, now = Date.now(), id }) {
  const secs = knownSections(sections);
  const clean = cleanName(name);
  if (!clean) throw new UserError('Escribe un nombre para el preset.');
  if (!secs.length) throw new UserError('Marca al menos una sección para guardar.');
  return {
    id: id ?? makeId(now),
    name: clean,
    sections: secs,
    data: capturePreset(state, secs),
    createdAt: now,
    updatedAt: now,
  };
}

/** Estado resultante de aplicar un preset sobre `state` (no lo muta). Solo toca sus secciones. */
export function applyPreset(state, preset) {
  const out = clone(state);
  for (const s of knownSections(preset.sections)) {
    for (const key of PRESET_SECTIONS[s].keys) {
      if (key in preset.data) out[key] = deepMerge(out[key], preset.data[key]);
    }
  }
  return hydrate(out);
}

// ---------- Biblioteca (localStorage) ----------

export const emptyLibrary = () => ({ v: 1, items: [], defaultId: null });

/** Carga la biblioteca guardada (o una vacía). Nunca lanza. */
export function loadLibrary(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PRESETS_KEY);
    if (!raw) return emptyLibrary();
    const data = JSON.parse(raw);
    const items = (Array.isArray(data.items) ? data.items : []).map(sanitizePreset).filter(Boolean);
    const defaultId = items.some((p) => p.id === data.defaultId) ? data.defaultId : null;
    return { v: 1, items, defaultId };
  } catch {
    return emptyLibrary();
  }
}

/** Guarda la biblioteca. Lanza si no cabe (cuota) o no hay almacenamiento. */
export function saveLibrary(lib, storage = globalThis.localStorage) {
  storage.setItem(PRESETS_KEY, JSON.stringify(lib));
}

const touch = (lib, items, defaultId = lib.defaultId) => ({
  ...lib,
  items,
  defaultId: items.some((p) => p.id === defaultId) ? defaultId : null,
});

/** Nombre libre: si "X" existe, "X (2)", "X (3)"… */
export function uniqueName(lib, name) {
  const taken = new Set(lib.items.map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name.slice(0, MAX_NAME - 6)} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export function addPreset(lib, preset) {
  if (lib.items.length >= MAX_PRESETS) throw new UserError(`Has llegado al máximo de ${MAX_PRESETS} presets.`);
  return touch(lib, [...lib.items, { ...preset, name: uniqueName(lib, preset.name) }]);
}

export const removePreset = (lib, id) =>
  touch(
    lib,
    lib.items.filter((p) => p.id !== id),
  );

export const renamePreset = (lib, id, name) => {
  const clean = cleanName(name);
  if (!clean) throw new UserError('El nombre no puede estar vacío.');
  const others = { ...lib, items: lib.items.filter((p) => p.id !== id) };
  return touch(
    lib,
    lib.items.map((p) => (p.id === id ? { ...p, name: uniqueName(others, clean), updatedAt: Date.now() } : p)),
  );
};

/** Sustituye el contenido de un preset por los ajustes actuales (mismas secciones o las indicadas). */
export const updatePreset = (lib, id, state, sections) =>
  touch(
    lib,
    lib.items.map((p) => {
      if (p.id !== id) return p;
      const secs = knownSections(sections ?? p.sections);
      return { ...p, sections: secs, data: capturePreset(state, secs), updatedAt: Date.now() };
    }),
  );

/** Marca (o desmarca con null) el preset que se aplica al empezar un proyecto nuevo. */
export const setDefaultPreset = (lib, id) => touch(lib, lib.items, id);

export const getDefaultPreset = (lib) => lib.items.find((p) => p.id === lib.defaultId) ?? null;

// ---------- Archivos de presets ----------

/** Valida y normaliza un preset venido de fuera. Devuelve null si no sirve. */
export function sanitizePreset(p) {
  if (!isObject(p) || !isObject(p.data)) return null;
  const sections = knownSections(p.sections);
  const name = cleanName(p.name);
  if (!sections.length || !name) return null;
  const data = {};
  for (const s of sections) {
    for (const key of PRESET_SECTIONS[s].keys) if (key in p.data) data[key] = clone(p.data[key]);
  }
  const num = (v) => (Number.isFinite(v) ? v : Date.now());
  return {
    id: typeof p.id === 'string' && /^[\w-]{1,40}$/.test(p.id) ? p.id : makeId(),
    name,
    sections,
    data,
    createdAt: num(p.createdAt),
    updatedAt: num(p.updatedAt),
  };
}

/** ¿Los datos de un archivo importado son un archivo de presets (y no un proyecto)? */
export const isPresetFile = (data) => isObject(data) && data._app === APP_ID && data.kind === FILE_KIND;

export function serializePresets(presets) {
  return JSON.stringify({ _app: APP_ID, kind: FILE_KIND, v: 1, presets }, null, 2);
}

/**
 * Presets de un archivo importado, ya validados.
 * @throws {UserError} si no hay ninguno válido.
 */
export function readPresetFile(data) {
  const list = Array.isArray(data?.presets) ? data.presets : [];
  const presets = list.map(sanitizePreset).filter(Boolean);
  if (!presets.length) throw new UserError('El archivo no contiene presets válidos.');
  return presets;
}

/** Añade presets importados con id nuevo y nombre libre. Devuelve la biblioteca y cuántos entraron. */
export function importPresets(lib, presets) {
  let out = lib;
  let added = 0;
  for (const p of presets) {
    if (out.items.length >= MAX_PRESETS) break;
    out = addPreset(out, { ...p, id: makeId() + added });
    added++;
  }
  return { library: out, added, skipped: presets.length - added };
}
