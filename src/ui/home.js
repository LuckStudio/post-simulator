import { timeAgo } from '../core/time.js';
import { $, h } from './dom.js';
import { svgIcon } from './icons.js';
import { overlays } from './overlays.js';

const BRAND_ICON = './favicon.svg';

/**
 * Pantalla de inicio: el último proyecto para seguir donde se quedó, la lista de proyectos
 * guardados (abrir, renombrar, duplicar, descargar, eliminar) y los botones de nuevo/importar.
 * Alterna con el editor mediante `data-screen` ('home' | 'editor') en <html>.
 *
 * @param {object} o
 * @param {object} o.projects  `actions.projects`: list, open, create, duplicate, rename, remove, exportJson, flush, currentId
 * @param {object} o.menu      menú contextual (createContextMenu)
 * @param {()=>void} o.onImport  abre el selector de archivos para importar
 */
export function createHome({ projects, menu, onImport }) {
  const root = $('#home');
  const html = document.documentElement;
  let seq = 0; // descarta respuestas de listados antiguos si hay varios seguidos

  const screen = () => html.dataset.screen;
  function setScreen(s) {
    html.dataset.screen = s;
    root.hidden = s !== 'home';
  }

  // Al volver atrás en el móvil desde el editor se llega a la pantalla de inicio.
  const backToHome = () => {
    setScreen('home');
    refresh();
  };

  function enterEditor() {
    if (screen() === 'editor') return;
    setScreen('editor');
    overlays.push(backToHome);
    window.dispatchEvent(new Event('resize')); // el editor estaba oculto: recalcula tamaños
  }

  function goHome() {
    if (screen() === 'home') return;
    overlays.release(backToHome);
    backToHome();
  }

  async function open(id) {
    await projects.open(id);
    enterEditor();
  }

  async function create() {
    await projects.create({ name: 'Proyecto sin título' });
    enterEditor();
  }

  // ---------- Acciones por proyecto ----------

  async function rename(m) {
    const name = prompt('Nuevo nombre del proyecto', m.name);
    if (name == null) return;
    await projects.rename(m.id, name);
    refresh();
  }
  async function duplicate(m) {
    await projects.duplicate(m.id);
    refresh();
  }
  async function remove(m) {
    if (!confirm(`¿Eliminar «${m.name}»? Se borra también su vídeo y no se puede deshacer.`)) return;
    await projects.remove(m.id);
    refresh();
  }

  function openMenu(m, { x = 0, y = 0, opener = null } = {}) {
    menu.open({
      x,
      y,
      title: m.name,
      opener,
      anchor: opener?.getBoundingClientRect(),
      items: [
        { label: 'Abrir', icon: 'edit', onSelect: () => open(m.id), onSelectMovesFocus: true },
        { label: 'Renombrar', icon: 'text', onSelect: () => rename(m), onSelectMovesFocus: true },
        { label: 'Duplicar', icon: 'copy', onSelect: () => duplicate(m) },
        {
          label: 'Descargar (JSON)',
          desc: 'El proyecto sin el vídeo',
          icon: 'export',
          onSelect: () => projects.exportJson(m.id),
        },
        { separator: true },
        { label: 'Eliminar', icon: 'trash', danger: true, onSelect: () => remove(m), onSelectMovesFocus: true },
      ],
    });
  }

  // ---------- Pintado ----------

  const metaLine = (m) =>
    `${m.slides} ${m.slides === 1 ? 'slide' : 'slides'} · ${m.format}${m.hasVideo ? ' · con vídeo' : ''}`;

  function thumb(m) {
    return h(
      'span',
      { class: 'pc-thumb', style: `aspect-ratio: ${m.format.replace(':', ' / ')}` },
      m.thumb ? h('img', { src: m.thumb, alt: '', loading: 'lazy' }) : svgIcon('post', 28),
    );
  }

  /** Tarjeta de proyecto: botón principal para abrirlo + botón «más acciones». */
  function card(m, { hero = false } = {}) {
    const more = h('button', {
      type: 'button',
      class: 'btn icon pc-more',
      'aria-label': `Más acciones de «${m.name}»`,
      'aria-haspopup': 'menu',
    });
    more.append(svgIcon('more', 20));
    more.addEventListener('click', () => openMenu(m, { opener: more }));
    const main = h(
      'button',
      { type: 'button', class: 'pc-main', onclick: () => open(m.id) },
      thumb(m),
      h(
        'span',
        { class: 'pc-text' },
        h('strong', { class: 'pc-name' }, m.name),
        h('span', { class: 'pc-meta' }, `Editado ${timeAgo(m.updatedAt)}`),
        h('span', { class: 'pc-meta' }, metaLine(m)),
        hero && h('span', { class: 'btn primary pc-go' }, 'Seguir editando'),
      ),
    );
    const el = h('li', { class: `pc${hero ? ' hero' : ''}` }, main, more);
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openMenu(m, { x: e.clientX, y: e.clientY, opener: more });
    });
    return el;
  }

  function render(list) {
    const current = list.find((m) => m.id === projects.currentId) ?? list[0];
    const others = list.filter((m) => m !== current);
    const newBtn = h(
      'button',
      { type: 'button', class: 'btn primary', onclick: create },
      svgIcon('plus', 18),
      'Nuevo proyecto',
    );
    const importBtn = h(
      'button',
      { type: 'button', class: 'btn', onclick: onImport },
      svgIcon('upload', 18),
      'Importar',
    );

    root.replaceChildren(
      h(
        'div',
        { class: 'home-inner' },
        h(
          'header',
          { class: 'home-head' },
          h('img', { src: BRAND_ICON, alt: '', width: 44, height: 44 }),
          h(
            'div',
            {},
            h('h1', {}, 'Post Simulator'),
            h('p', {}, 'Simula cómo se verá tu publicación antes de subirla.'),
          ),
        ),
        h('div', { class: 'home-actions' }, newBtn, importBtn),
        current && [
          h('h2', { class: 'home-h' }, 'Seguir con…'),
          h('ul', { class: 'pc-list single' }, card(current, { hero: true })),
        ],
        others.length > 0 && [
          h('h2', { class: 'home-h' }, `Otros proyectos (${others.length})`),
          h(
            'ul',
            { class: 'pc-list' },
            others.map((m) => card(m)),
          ),
        ],
        h('p', { class: 'home-foot' }, 'Tus proyectos se guardan en este dispositivo, no en ningún servidor.'),
      ),
    );
  }

  /** Vuelve a leer la biblioteca y pinta la lista (guarda antes lo pendiente del proyecto abierto). */
  async function refresh() {
    const mine = ++seq;
    await projects.flush();
    const list = await projects.list();
    if (mine !== seq || screen() !== 'home') return;
    render(list);
  }

  $('#homeGo').addEventListener('click', goHome);

  return {
    goHome,
    enterEditor,
    refresh,
    get screen() {
      return screen();
    },
    /** Pantalla con la que arranca la app (la decide el script en línea de index.html). */
    start() {
      setScreen(screen() === 'editor' ? 'editor' : 'home');
      if (screen() === 'home') refresh();
    },
  };
}
