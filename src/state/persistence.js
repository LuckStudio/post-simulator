import { STORAGE_KEY } from '../core/constants.js';
import { hydrate } from './store.js';

/** Carga el proyecto guardado en este navegador (o null). Nunca lanza. */
export function loadSaved(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? hydrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Guarda automáticamente el proyecto tras cada cambio, con un retardo.
 * `onQuotaExceeded` se llama una sola vez si el proyecto no cabe.
 */
export function autosave(store, { delay = 500, storage = globalThis.localStorage, onQuotaExceeded } = {}) {
  let timer = null;
  let warned = false;
  return store.subscribe((state) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        if (!warned) {
          warned = true;
          onQuotaExceeded?.();
        }
      }
    }, delay);
  });
}

/**
 * Autoguardado en la biblioteca de proyectos (IndexedDB): igual que `autosave`, pero escribe en el
 * proyecto abierto. Los guardados se encadenan para que nunca lleguen desordenados.
 *
 * @param {object} store
 * @param {{save:(id:string,state:object,extra?:object)=>Promise<unknown>}} projects
 * @param {object} o
 * @param {()=>string|null} o.getId    proyecto abierto en este momento
 * @param {(force:boolean)=>object} [o.describe]  datos extra para la ficha (slides, miniatura)
 * @param {(e:unknown)=>void} [o.onError]  se llama una vez si no se puede guardar
 */
export function autosaveProject(store, projects, { getId, describe, delay = 600, onError } = {}) {
  let timer = null;
  let dirty = false;
  let paused = false;
  let warned = false;
  let chain = Promise.resolve();

  const write = (force) => {
    const id = getId();
    if (!id) return chain;
    dirty = false;
    // Se toma ahora (no cuando le toque a la cadena) para guardar el proyecto que se estaba editando.
    const state = store.state;
    const extra = describe?.(force);
    chain = chain.then(async () => {
      try {
        await projects.save(id, state, extra);
      } catch (e) {
        if (!warned) {
          warned = true;
          onError?.(e);
        }
      }
    });
    return chain;
  };

  const unsubscribe = store.subscribe(() => {
    if (paused) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => write(false), delay);
  });

  return {
    /** Guarda ya lo pendiente (p. ej. antes de cambiar de proyecto o al cerrar la pestaña). */
    flush() {
      clearTimeout(timer);
      return dirty ? write(true) : chain;
    },
    /** Ejecuta `fn` sin que sus cambios al store cuenten como ediciones del usuario. */
    withoutSaving(fn) {
      paused = true;
      try {
        return fn();
      } finally {
        paused = false;
      }
    },
    dispose() {
      clearTimeout(timer);
      unsubscribe();
    },
  };
}
