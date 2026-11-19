import { createProjects, defaultProjectName } from './projects.js';

/**
 * Abre la biblioteca de proyectos al arrancar y decide con qué proyecto empezar:
 *  1. La primera vez, pasa el proyecto antiguo de localStorage (si hay) a la biblioteca.
 *  2. Abre el último proyecto usado o, si ya no está, el más reciente.
 *  3. Si no hay ninguno, crea uno nuevo con el estado inicial.
 *
 * @param {object} o
 * @param {object} o.backend              almacén (IndexedDB o memoria)
 * @param {object} o.prefs                preferencias (lastProject, legacyMigrated)
 * @param {()=>object|null} o.loadLegacy  lee el proyecto antiguo de localStorage
 * @param {()=>object} o.makeInitial      estado de un proyecto nuevo
 * @returns {Promise<{projects:object, current:{meta:object,state:object,video:object|null}}>}
 * @throws si el almacén no funciona (quien llama vuelve al guardado clásico).
 */
export async function bootProjects({ backend, prefs, loadLegacy, makeInitial }) {
  const projects = createProjects(backend);
  let list = await projects.list();

  if (!prefs.get().legacyMigrated) {
    if (!list.length) {
      const legacy = loadLegacy();
      if (legacy) {
        const meta = await projects.create({ name: defaultProjectName(legacy), state: legacy });
        list = [meta];
      }
    }
    prefs.markLegacyMigrated();
  }

  const lastId = prefs.get().lastProject;
  const pick = list.find((m) => m.id === lastId) ?? list[0];
  let current = pick ? await projects.load(pick.id) : null;

  if (!current) {
    const state = makeInitial();
    const meta = await projects.create({ state });
    current = await projects.load(meta.id);
  }
  prefs.setLastProject(current.meta.id);
  return { projects, current };
}
