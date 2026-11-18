import { FORMATS } from '../core/constants.js';
import { canShareImages } from '../export/share.js';
import { pickMime } from '../export/video.js';
import { renderSlideToCanvas } from '../render/carousel.js';
import { h } from './dom.js';
import { svgIcon } from './icons.js';
import { openSheet } from './sheet.js';

const THUMB_H = 92;

/**
 * Hoja de exportación del móvil: miniaturas del carrusel, «Compartir» como acción principal
 * (hoja nativa del sistema: Instagram, WhatsApp, Fotos…), imágenes, vídeo y proporción.
 */
export function createExportSheet({ store, preview, actions, panels }) {
  let sheet = null;

  /** Miniatura de una slide: se dibuja a tamaño nativo y se reduce. */
  function thumb(rc, slide) {
    const full = renderSlideToCanvas(rc, slide);
    const c = document.createElement('canvas');
    c.width = Math.round((THUMB_H * 2 * rc.W) / rc.H);
    c.height = THUMB_H * 2;
    c.getContext('2d').drawImage(full, 0, 0, c.width, c.height);
    c.style.height = THUMB_H + 'px';
    c.style.width = Math.round((THUMB_H * rc.W) / rc.H) + 'px';
    c.className = 'xs-thumb';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', `Slide ${slide.index + 1}: ${slide.label}`);
    return c;
  }

  /** Cierra la hoja y ejecuta la acción (sin devolver el foco: la acción lo mueve). */
  const run = (fn) => () => {
    sheet?.close({ restoreFocus: false });
    fn();
  };

  function render(body) {
    const { rc, slides } = preview.carousel;
    const n = slides.length;
    const seconds = slides.reduce((a, s) => a + s.total, 0);
    const mime = pickMime();
    const canShare = canShareImages();

    body.replaceChildren(
      h(
        'div',
        { class: 'xs-thumbs' },
        slides.map((s) => thumb(rc, s)),
      ),
      h('p', { class: 'xs-meta' }, `${n} ${n === 1 ? 'slide' : 'slides'} · ${rc.W} × ${rc.H} px`),

      h(
        'button',
        { type: 'button', class: 'xs-share', onclick: run(() => actions.share.all()) },
        svgIcon('share', 26),
        h(
          'span',
          { class: 'xs-share-text' },
          h('strong', {}, canShare ? 'Compartir el carrusel' : 'Descargar las imágenes'),
          h('span', {}, canShare ? 'Directo a Instagram, WhatsApp o Fotos' : 'Un ZIP con todas las slides'),
        ),
      ),

      h(
        'div',
        { class: 'xs-cards' },
        h(
          'button',
          { type: 'button', class: 'xs-card', onclick: run(() => actions.exportPngAll()) },
          svgIcon('media', 24),
          h('strong', {}, 'Imágenes'),
          h('span', {}, 'Descargar en un ZIP'),
        ),
        h(
          'button',
          { type: 'button', class: 'xs-card', disabled: !mime, onclick: run(() => actions.exportVideo('all')) },
          svgIcon('video', 24),
          h('strong', {}, 'Vídeo animado'),
          h('span', {}, mime ? `Todo el carrusel · ${Math.round(seconds)} s` : 'No disponible en este navegador'),
        ),
      ),

      h(
        'div',
        { class: 'field' },
        h('span', { class: 'lbl' }, 'Proporción'),
        h(
          'div',
          { class: 'seg', role: 'group', 'aria-label': 'Proporción' },
          Object.keys(FORMATS).map((f) =>
            h(
              'button',
              {
                type: 'button',
                'aria-pressed': String(store.state.format === f),
                onclick: () => {
                  store.set('format', f);
                  actions.renderFormatSwitch();
                  preview.flush();
                  render(body);
                },
              },
              f,
            ),
          ),
        ),
      ),

      h(
        'button',
        { type: 'button', class: 'xs-more', onclick: run(() => panels.select('export')) },
        'Más formatos: ZIP, HTML, proyecto…',
      ),
    );
  }

  return {
    open() {
      if (sheet) return;
      preview.syncVideoStatic();
      const body = h('div', { class: 'xs' });
      sheet = openSheet({ title: 'Exportar', content: body, onClose: () => (sheet = null) });
      render(body);
    },
    close() {
      sheet?.close();
    },
  };
}
