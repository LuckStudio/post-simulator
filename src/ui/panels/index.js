import { $, h } from '../dom.js';
import { svgIcon } from '../icons.js';
import { animPanel } from './anim.js';
import { coverPanel } from './cover.js';
import { ctaPanel } from './cta.js';
import { exportPanel } from './export.js';
import { mediaPanel } from './media.js';
import { postPanel } from './post.js';
import { stylePanel } from './style.js';

/** Secciones de la barra lateral: [id, etiqueta, icono, función que devuelve los nodos]. */
const SECTIONS = [
  ['post', 'Post', 'post', postPanel],
  ['media', 'Multimedia', 'media', mediaPanel],
  ['cover', 'Portada', 'cover', coverPanel],
  ['cta', 'Cierre', 'cta', ctaPanel],
  ['style', 'Estilo', 'style', stylePanel],
  ['anim', 'Animación', 'anim', animPanel],
  ['export', 'Exportar', 'export', exportPanel],
];

/** En pantallas estrechas el panel queda debajo de la vista previa. */
const isNarrow = () => window.matchMedia('(max-width: 900px)').matches;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Barra lateral de iconos + panel de ajustes de la sección activa. `deps` se pasa a
 * cada sección junto con `rerender`, para que puedan repintarse cuando cambian
 * opciones dependientes.
 */
export function createPanelHost(deps) {
  let active = 'post';
  const nav = $('#tabs');
  const body = $('#panel');
  const title = $('#panelTitle');

  function renderTabs() {
    nav.replaceChildren(
      ...SECTIONS.map(([id, label, icon]) =>
        h(
          'button',
          {
            type: 'button',
            class: id === 'export' ? 'rail-btn rail-end' : 'rail-btn',
            'aria-current': id === active ? 'page' : 'false',
            onclick: () => select(id, { reveal: true }),
          },
          svgIcon(icon),
          h('span', {}, label),
        ),
      ),
    );
  }

  function render() {
    const scroll = body.scrollTop;
    const [, label, , panel] = SECTIONS.find(([id]) => id === active);
    title.textContent = label;
    const nodes = [panel({ ...deps, rerender: render })].flat(Infinity).filter(Boolean);
    body.replaceChildren(...nodes);
    body.scrollTop = scroll;
  }

  /** Cambia de sección. `reveal` lleva la vista hasta el panel cuando está debajo de la vista previa. */
  function select(id, { reveal = false } = {}) {
    active = id;
    renderTabs();
    render();
    body.scrollTop = 0;
    if (reveal && isNarrow()) {
      $('.panel').scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  return {
    renderTabs,
    render,
    select,
    get active() {
      return active;
    },
  };
}
