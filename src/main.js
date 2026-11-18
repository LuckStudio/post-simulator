import './styles/app.css';
import { startApp } from './app.js';
import { registerServiceWorker } from './pwa.js';
import { renderSlideToCanvas } from './render/carousel.js';

const app = startApp();
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
    app.preview.carousel.slides.map((s) => ({ label: s.label, total: s.total, hasVideo: !!s.hasVideo, type: s.type })),
  /** Canvas a tamaño nativo con la slide `index` en el segundo `t` (null = estática). */
  renderSlide(index, t = null) {
    const { rc, slides } = app.preview.carousel;
    return renderSlideToCanvas(rc, slides[index], t);
  },
};
