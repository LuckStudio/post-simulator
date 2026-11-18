import { PREFS_KEY } from '../core/constants.js';
import { DEFAULT_UI, normalizeUi } from '../core/uiSettings.js';

const MAX_RECENT_FONTS = 6;
const MAX_INSTALLED_FONTS = 800;

const defaults = () => ({ fontsRecent: [], fontsInstalled: [], ui: { ...DEFAULT_UI } });
const cleanList = (v, max) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x).slice(0, max) : []);

/**
 * Preferencias de este navegador que no forman parte del proyecto: ajustes de la interfaz
 * (apariencia, densidad…), tipografías recientes y la lista de fuentes instaladas ya
 * detectada. Nunca lanza.
 */
export function createPrefs(storage = globalThis.localStorage) {
  const read = () => {
    try {
      const raw = JSON.parse(storage?.getItem(PREFS_KEY) || '{}');
      return {
        fontsRecent: cleanList(raw.fontsRecent, MAX_RECENT_FONTS),
        fontsInstalled: cleanList(raw.fontsInstalled, MAX_INSTALLED_FONTS),
        ui: normalizeUi(raw.ui),
      };
    } catch {
      return defaults();
    }
  };
  const write = (prefs) => {
    try {
      storage?.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* sin almacenamiento: las preferencias no se conservan */
    }
  };
  return {
    get: read,
    /** Pone `name` el primero de las tipografías recientes. */
    addRecentFont(name) {
      const p = read();
      p.fontsRecent = [name, ...p.fontsRecent.filter((n) => n !== name)].slice(0, MAX_RECENT_FONTS);
      write(p);
    },
    setInstalledFonts(names) {
      const p = read();
      p.fontsInstalled = cleanList(names, MAX_INSTALLED_FONTS);
      write(p);
    },
    /** Cambia ajustes de la interfaz; los valores desconocidos se descartan. */
    setUi(patch) {
      const p = read();
      p.ui = normalizeUi({ ...p.ui, ...patch });
      write(p);
      return p.ui;
    },
    resetUi() {
      const p = read();
      p.ui = { ...DEFAULT_UI };
      write(p);
      return p.ui;
    },
  };
}
