import './styles/app.css';
import { initialState, startApp } from './app.js';
import { bootProjects } from './state/boot.js';
import { createIdbBackend } from './state/projectsDb.js';
import { loadSaved } from './state/persistence.js';
import { createPrefs } from './state/prefs.js';
import { registerServiceWorker } from './pwa.js';
import { renderSlideToCanvas } from './render/carousel.js';

/** Abre la biblioteca de proyectos; si el navegador no deja usar IndexedDB, se sigue con localStorage. */
async function openLibrary() {
  try {
    return await bootProjects({
      backend: createIdbBackend(),
      prefs: createPrefs(),
      loadLegacy: () => loadSaved(),
      makeInitial: initialState,
    });
  } catch {
    return null;
  }
}

/** Arranca la app cuando la biblioteca de proyectos está lista. */
async function main() {
  const app = startApp({ boot: await openLibrary() });
  registerServiceWorker();

  /**
   * API mínima para automatización y pruebas (scripts/compare-legacy.mjs, Playwright…).
   * No la usa la interfaz.
   */
  window.carruselStudio = {
    get state() {
      return app.store.snapshot();
    },
    /** Número de slides del carrusel actual. */
    slideCount: () => app.preview.carousel.slides.length,
    /** Etiqueta, duración total (s) y si lleva vídeo de cada slide. */
    slideInfo: () =>
      app.preview.carousel.slides.map((s) => ({
        label: s.label,
        total: s.total,
        hasVideo: !!s.hasVideo,
        type: s.type,
      })),
    /** Canvas a tamaño nativo con la slide `index` en el segundo `t` (null = estática). */
    renderSlide(index, t = null) {
      const { rc, slides } = app.preview.carousel;
      return renderSlideToCanvas(rc, slides[index], t);
    },
    /** Biblioteca de proyectos (list, open, create, duplicate, rename, remove). */
    projects: app.actions.projects,
  };
}

main();
