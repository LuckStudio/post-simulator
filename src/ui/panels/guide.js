import { h } from '../dom.js';
import { mediaPanel } from './media.js';
import { stylePanel } from './style.js';

/** Secciones completas del editor que algunos pasos reutilizan tal cual. */
const PANELS = { media: mediaPanel, style: stylePanel };

/**
 * Panel del modo guiado: el paso actual (campos, una sección del editor o la pantalla final),
 * el avance y los botones Atrás / Siguiente. Edita el mismo proyecto que el editor completo.
 * `deps.guide` es el controlador definido en `app.js`.
 */
export function guidePanel(deps) {
  const { f, guide, actions } = deps;
  const { step, index, total } = guide;
  const col = (...kids) => h('div', { class: 'btn-col' }, ...kids);

  let content;
  if (step.fields) {
    content = step.fields.map((fl) =>
      f.text(fl.label, fl.path, { area: fl.kind === 'area', rows: fl.rows ?? 3, ph: fl.ph ?? '' }),
    );
  } else if (step.panel) {
    content = PANELS[step.panel](deps);
  } else {
    content = f.group(
      'Descargar o compartir',
      null,
      col(
        f.button('Descargar las imágenes (ZIP)', actions.exportPngAll, { cls: 'btn primary' }),
        f.button('Compartir', () => actions.share.all()),
        f.button('Vídeo animado del carrusel', () => actions.exportVideo('all')),
      ),
    );
  }

  return [
    // En escritorio el título ya está en la cabecera del panel; en el móvil no hay cabecera.
    h('strong', { class: 'g-title' }, step.title),
    h(
      'div',
      { class: 'g-progress', role: 'group', 'aria-label': 'Avance' },
      h('span', { class: 'g-count' }, `Paso ${index + 1} de ${total}`),
      h('span', { class: 'g-bar', 'aria-hidden': 'true' }, h('i', { style: `width: ${((index + 1) / total) * 100}%` })),
    ),
    h('p', { class: 'hint g-hint' }, step.hint),
    ...[content].flat(Infinity).filter(Boolean),
    h(
      'div',
      { class: 'g-nav' },
      h('button', { type: 'button', class: 'btn', disabled: index === 0, onclick: () => guide.back() }, 'Atrás'),
      h(
        'button',
        { type: 'button', class: 'btn primary', onclick: () => guide.next() },
        index === total - 1 ? 'Terminar' : 'Siguiente',
      ),
    ),
    h('button', { type: 'button', class: 'btn ghost g-exit', onclick: () => guide.exit() }, 'Ir al editor completo'),
  ];
}
