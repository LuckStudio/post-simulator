import { $, h } from '../dom.js';
import { animPanel } from './anim.js';
import { coverPanel } from './cover.js';
import { ctaPanel } from './cta.js';
import { exportPanel } from './export.js';
import { mediaPanel } from './media.js';
import { postPanel } from './post.js';
import { stylePanel } from './style.js';

/** Pestañas del panel lateral: [id, etiqueta, función que devuelve los nodos]. */
const TABS = [
  ['post', 'Publicación', postPanel],
  ['media', 'Multimedia', mediaPanel],
  ['cover', 'Portada', coverPanel],
  ['cta', 'Cierre', ctaPanel],
  ['style', 'Estilo', stylePanel],
  ['anim', 'Animación', animPanel],
  ['export', 'Exportar', exportPanel],
];

/**
 * Panel lateral con pestañas. `deps` se pasa a cada pestaña junto con
 * `rerender`, para que puedan repintarse cuando cambian opciones dependientes.
 */
export function createPanelHost(deps) {
  let active = 'post';
  const nav = $('#tabs');
  const body = $('#panel');

  function renderTabs() {
    nav.replaceChildren(
      ...TABS.map(([id, label]) =>
        h(
          'button',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': id === active ? 'true' : 'false',
            onclick: () => {
              active = id;
              renderTabs();
              render();
              body.scrollTop = 0;
            },
          },
          label,
        ),
      ),
    );
  }

  function render() {
    const scroll = body.scrollTop;
    const [, , panel] = TABS.find(([id]) => id === active);
    const nodes = [panel({ ...deps, rerender: render })].flat(Infinity).filter(Boolean);
    body.replaceChildren(...nodes);
    body.scrollTop = scroll;
  }

  return {
    renderTabs,
    render,
    get active() {
      return active;
    },
  };
}
