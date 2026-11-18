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
