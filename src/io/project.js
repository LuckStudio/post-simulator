import { APP_ID } from '../core/constants.js';
import { UserError } from '../core/errors.js';

/** ID del <script type="application/json"> que lleva el proyecto dentro del HTML visor. */
export const EMBED_ID = 'carousel-state';

/** Serializa el proyecto para el JSON exportado. */
export function serializeProject(state) {
  return JSON.stringify({ ...state, _app: APP_ID }, null, 2);
}

/**
 * Extrae los datos de proyecto de un archivo importado (JSON o HTML visor).
 * Devuelve el objeto sin normalizar; el store se encarga de completarlo.
 * @throws {Error} con un mensaje para el usuario si el archivo no es válido.
 */
export function parseProjectFile(name, text) {
  try {
    if (/\.html?$/i.test(name) || /^\s*</.test(text)) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const el = doc.getElementById(EMBED_ID);
      if (!el) throw new UserError('Ese HTML no contiene un carrusel exportado desde aquí.');
      return JSON.parse(el.textContent);
    }
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError('El archivo no es un proyecto válido (JSON o HTML exportado).');
  }
}

export { UserError };
