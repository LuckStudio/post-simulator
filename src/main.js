import './styles/app.css';
import { startApp } from './app.js';
import { renderSlideToCanvas } from './render/carousel.js';

const app = startApp();

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
  /** Canvas a tamaño nativo con la slide `index` en el segundo `t` (null = estática). */
  renderSlide(index, t = null) {
    const { rc, slides } = app.preview.carousel;
    return renderSlideToCanvas(rc, slides[index], t);
  },
};
