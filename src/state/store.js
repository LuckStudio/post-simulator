import { clone, getPath, setPath } from '../core/utils.js';
import { createDefaultState } from './defaults.js';
import { migrate } from './migrate.js';

/** Claves que nunca se copian de datos externos (archivos importados). */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Mezcla `over` sobre `base` respetando la forma de `base`:
 * - los arrays se sustituyen enteros,
 * - los objetos se mezclan clave a clave,
 * - las claves nuevas de `over` se conservan.
 * Así un proyecto antiguo o incompleto siempre queda con todas las claves actuales.
 */
export function deepMerge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (over && typeof over === 'object') {
      for (const k of Object.keys(over)) {
        if (UNSAFE_KEYS.has(k)) continue;
        out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
      }
    }
    return out;
  }
  return over === undefined ? base : over;
}

/** Normaliza cualquier dato externo (localStorage, JSON importado…) a un estado completo. */
export function hydrate(data) {
  const copy = migrate(data);
  delete copy._app;
  return deepMerge(createDefaultState(), copy);
}

/**
 * Almacén único del proyecto. Las vistas leen `store.state` y escriben con
 * `set`, `update` o `replace`; cada cambio notifica a los suscriptores.
 */
export function createStore(initial = createDefaultState()) {
  let state = initial;
  const listeners = new Set();
  const emit = (reason) => listeners.forEach((fn) => fn(state, reason));

  return {
    get state() {
      return state;
    },
    get(path) {
      return getPath(state, path);
    },
    /** Cambia un valor por ruta ("cover.role", "stats.labels.2"…). */
    set(path, value) {
      setPath(state, path, value);
      emit('set');
    },
    /** Cambios compuestos: la función recibe el estado y puede mutarlo. */
    update(fn) {
      fn(state);
      emit('update');
    },
    /** Sustituye el proyecto entero (importar, restablecer…). */
    replace(next) {
      state = hydrate(next);
      emit('replace');
    },
    reset() {
      state = createDefaultState();
      emit('replace');
    },
    snapshot() {
      return clone(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
