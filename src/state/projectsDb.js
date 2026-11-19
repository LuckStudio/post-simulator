/**
 * Almacenes de la biblioteca de proyectos. Tres «tablas» con clave `id`:
 *   - meta:  datos ligeros para listar (nombre, fechas, miniatura…).
 *   - data:  el estado completo del proyecto (puede pesar varios MB por las imágenes).
 *   - blobs: archivos binarios (el vídeo del post), guardados como Blob.
 * Separarlos permite listar muchos proyectos sin leer sus imágenes.
 *
 * Interfaz común (todo asíncrono):
 *   get(store, id) · all(store) · batch([{ op: 'put', store, value } | { op: 'del', store, id }])
 * `batch` es atómico: o se aplican todas las operaciones o ninguna.
 */

export const STORES = ['meta', 'data', 'blobs'];
export const DB_NAME = 'post-simulator';
export const DB_VERSION = 1;

/** Backend en memoria: para pruebas y como referencia de la interfaz. */
export function createMemoryBackend() {
  const tables = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  const check = (store) => {
    if (!tables[store]) throw new Error(`Almacén desconocido: ${store}`);
    return tables[store];
  };
  return {
    async get(store, id) {
      return check(store).get(id);
    },
    async all(store) {
      return [...check(store).values()];
    },
    async batch(ops) {
      // Se valida todo antes de aplicar nada, para que sea atómico.
      ops.forEach((o) => check(o.store));
      for (const o of ops) {
        if (o.op === 'put') tables[o.store].set(o.value.id, o.value);
        else tables[o.store].delete(o.id);
      }
    },
  };
}

/** Backend sobre IndexedDB. Si no está disponible, la primera operación falla con un Error. */
export function createIdbBackend(factory = globalThis.indexedDB, name = DB_NAME) {
  let opening = null;

  function open() {
    opening ??= new Promise((resolve, reject) => {
      if (!factory) {
        reject(new Error('IndexedDB no está disponible en este navegador.'));
        return;
      }
      let req;
      try {
        req = factory.open(name, DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = () => {
        for (const s of STORES) {
          if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Si otra pestaña pide actualizar la base, se cierra para no bloquearla.
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
    }).catch((e) => {
      opening = null;
      throw e;
    });
    return opening;
  }

  /** Ejecuta `fn(stores)` en una transacción y devuelve lo que `fn` devuelva cuando termine. */
  async function run(storeNames, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      let out;
      try {
        out = fn(Object.fromEntries(storeNames.map((s) => [s, tx.objectStore(s)])));
      } catch (e) {
        try {
          tx.abort();
        } catch {
          /* ya cerrada */
        }
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada.'));
    });
  }

  return {
    get: (store, id) => run([store], 'readonly', (s) => s[store].get(id)),
    all: (store) => run([store], 'readonly', (s) => s[store].getAll()),
    batch(ops) {
      if (!ops.length) return Promise.resolve();
      const names = [...new Set(ops.map((o) => o.store))];
      return run(names, 'readwrite', (s) => {
        for (const o of ops) {
          if (o.op === 'put') s[o.store].put(o.value);
          else s[o.store].delete(o.id);
        }
      });
    },
  };
}
