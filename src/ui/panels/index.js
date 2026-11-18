import { $, h } from '../dom.js';
import { svgIcon } from '../icons.js';
import { animPanel } from './anim.js';
import { coverPanel } from './cover.js';
import { ctaPanel } from './cta.js';
import { exportPanel } from './export.js';
import { mediaPanel } from './media.js';
import { postPanel } from './post.js';
import { presetsPanel } from './presets.js';
import { settingsPanel } from './settings.js';
import { stylePanel } from './style.js';

/** Secciones de la barra lateral: [id, etiqueta, icono, función que devuelve los nodos]. */
const SECTIONS = [
  ['post', 'Post', 'post', postPanel],
  ['media', 'Multimedia', 'media', mediaPanel, 'Medios'],
  ['cover', 'Portada', 'cover', coverPanel],
  ['cta', 'Cierre', 'cta', ctaPanel],
  ['style', 'Estilo', 'style', stylePanel],
  ['anim', 'Animación', 'anim', animPanel],
  ['presets', 'Presets', 'presets', presetsPanel],
  ['export', 'Exportar', 'export', exportPanel],
  ['settings', 'Configuración', 'settings', settingsPanel, 'Ajustes'],
];

/** Clases extra de cada botón de la barra: Exportar abre el grupo inferior; Configuración va
 * al engranaje de la barra superior en pantallas estrechas. */
const RAIL_CLASS = { export: 'rail-end', settings: 'rail-settings' };

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
      ...SECTIONS.map(([id, label, icon, , short]) =>
        h(
          'button',
          {
            type: 'button',
            class: RAIL_CLASS[id] ? `rail-btn ${RAIL_CLASS[id]}` : 'rail-btn',
            'aria-current': id === active ? 'page' : 'false',
            onclick: () => select(id, { reveal: true }),
          },
          svgIcon(icon),
          // En pantallas muy estrechas la etiqueta larga se sustituye por la corta (ver CSS).
          short
            ? [h('span', { class: 'lbl-full' }, label), h('span', { class: 'lbl-short' }, short)]
            : h('span', {}, label),
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
