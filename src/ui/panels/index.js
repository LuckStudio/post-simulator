import { $, h } from '../dom.js';
import { svgIcon } from '../icons.js';
import { animPanel } from './anim.js';
import { coverPanel } from './cover.js';
import { ctaPanel } from './cta.js';
import { exportPanel } from './export.js';
import { guidePanel } from './guide.js';
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
    // En móvil las secciones son chips con desplazamiento horizontal: se conserva al repintar
    // y se deja a la vista el chip activo.
    const rail = nav.closest('.rail');
    const keep = rail ? rail.scrollLeft : 0;
    nav.replaceChildren(
      ...SECTIONS.map(([id, label, icon, , short]) =>
        h(
          'button',
          {
            type: 'button',
            class: RAIL_CLASS[id] ? `rail-btn ${RAIL_CLASS[id]}` : 'rail-btn',
            'aria-current': id === active ? 'page' : 'false',
            onclick: () => select(id),
          },
          svgIcon(icon),
          // En pantallas muy estrechas la etiqueta larga se sustituye por la corta (ver CSS).
          short
            ? [h('span', { class: 'lbl-full' }, label), h('span', { class: 'lbl-short' }, short)]
            : h('span', {}, label),
        ),
      ),
    );
    if (rail) {
      rail.scrollLeft = keep;
      nav.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  }

  function render() {
    const scroll = body.scrollTop;
    const guided = deps.guide?.active;
    const [, label, , panel] = SECTIONS.find(([id]) => id === active);
    title.textContent = guided ? deps.guide.step.title : label;
    const nodes = [(guided ? guidePanel : panel)({ ...deps, rerender: render })].flat(Infinity).filter(Boolean);
    body.replaceChildren(...nodes);
    body.scrollTop = scroll;
  }

  /** Cambia de sección y vuelve al principio de sus ajustes (y sale del modo guiado, si lo hay). */
  function select(id) {
    // Ir a una sección concreta (menú de slide, Configuración…) saca del paso a paso.
    if (deps.guide?.active) deps.guide.exit();
    active = id;
    renderTabs();
    render();
    body.scrollTop = 0;
  }

  /** Repinta el panel desde arriba (al cambiar de paso del modo guiado). */
  function renderFromTop() {
    render();
    body.scrollTop = 0;
  }

  return {
    renderTabs,
    render,
    renderFromTop,
    select,
    get active() {
      return active;
    },
  };
}
