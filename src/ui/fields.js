import { clamp } from '../core/utils.js';
import { h } from './dom.js';

/**
 * Fábrica de controles de formulario enlazados al store por ruta.
 * Cada control lee su valor con `store.get(path)` y escribe con `store.set`.
 * Con `rebuild: true`, tras el cambio se vuelve a pintar el panel (para
 * mostrar u ocultar opciones que dependen de ese valor).
 *
 * @param {{store: ReturnType<import('../state/store.js').createStore>, rerender: () => void}} deps
 */
export function createFields({ store, rerender }) {
  let uid = 0;
  const nextId = () => 'f' + ++uid;

  /** Escribe un valor; `onSet` se ejecuta antes de repintar el panel. */
  const set = (path, value, { rebuild = false, onSet } = {}) => {
    store.set(path, value);
    onSet?.(value);
    if (rebuild) rerender();
  };

  const field = (id, label, ...control) => h('div', { class: 'field' }, h('label', { for: id }, label), ...control);

  return {
    set,

    group(title, hint, ...kids) {
      return h(
        'section',
        { class: 'group' },
        h('h3', {}, title),
        hint ? h('p', { class: 'hint' }, hint) : null,
        ...kids,
      );
    },

    text(label, path, { area = false, rows = 3, ph = '' } = {}) {
      const id = nextId();
      const inp = area
        ? h('textarea', { id, rows, placeholder: ph })
        : h('input', { id, type: 'text', placeholder: ph });
      inp.value = store.get(path) ?? '';
      inp.addEventListener('input', () => set(path, inp.value));
      return field(id, label, inp);
    },

    number(label, path, { min = 0, max = 1e9, step = 1 } = {}) {
      const id = nextId();
      const inp = h('input', { id, type: 'number', min, max, step });
      inp.value = store.get(path);
      inp.addEventListener('input', () => {
        const v = Number(inp.value);
        if (!isNaN(v)) set(path, clamp(v, min, max));
      });
      return field(id, label, inp);
    },

    range(label, path, { min = 0, max = 100, step = 1, fmt = (v) => v, rebuild = false } = {}) {
      const id = nextId();
      const inp = h('input', { id, type: 'range', min, max, step });
      inp.value = store.get(path);
      const out = h('output', { for: id }, fmt(store.get(path)));
      inp.addEventListener('input', () => {
        const v = Number(inp.value);
        out.textContent = fmt(v);
        set(path, v);
      });
      if (rebuild) inp.addEventListener('change', () => rerender());
      return field(id, label, h('div', { class: 'range' }, inp, out));
    },

    select(label, path, opts, { rebuild = false, onSet } = {}) {
      const id = nextId();
      const sel = h('select', { id }, ...Object.entries(opts).map(([v, l]) => h('option', { value: v }, l)));
      sel.value = store.get(path);
      sel.addEventListener('change', () => set(path, sel.value, { rebuild, onSet }));
      return field(id, label, sel);
    },

    /** Control segmentado (botones excluyentes). Repinta el panel por defecto. */
    seg(label, path, opts, { rebuild = true, onSet } = {}) {
      const cur = store.get(path);
      const seg = h(
        'div',
        { class: 'seg', role: 'group', 'aria-label': label },
        ...Object.entries(opts).map(([v, l]) =>
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': String(v) === String(cur) ? 'true' : 'false',
              onclick: () => set(path, v, { rebuild, onSet }),
            },
            l,
          ),
        ),
      );
      return h('div', { class: 'field' }, label ? h('span', { class: 'lbl' }, label) : null, seg);
    },

    toggle(label, path, { rebuild = false } = {}) {
      const inp = h('input', { type: 'checkbox', role: 'switch' });
      inp.checked = !!store.get(path);
      inp.addEventListener('change', () => set(path, inp.checked, { rebuild }));
      return h('label', { class: 'toggle' }, h('span', {}, label), inp);
    },

    color(label, path) {
      const id = nextId();
      const c = h('input', { type: 'color', id, 'aria-label': label });
      const tx = h('input', { type: 'text', 'aria-label': label + ' en hexadecimal' });
      c.value = tx.value = store.get(path);
      c.addEventListener('input', () => {
        tx.value = c.value;
        set(path, c.value);
      });
      tx.addEventListener('change', () => {
        if (/^#[0-9a-f]{6}$/i.test(tx.value)) {
          c.value = tx.value;
          set(path, tx.value);
        } else tx.value = store.get(path);
      });
      return field(id, label, h('div', { class: 'color-row' }, c, tx));
    },

    /** Botón que abre un selector de archivos y llama a `onFiles(files)`. */
    file(text, accept, multiple, onFiles, cls = 'btn') {
      const inp = h('input', { type: 'file', accept, class: 'sr', tabindex: '-1' });
      if (multiple) inp.multiple = true;
      inp.addEventListener('change', async () => {
        const fs = [...inp.files];
        inp.value = '';
        if (fs.length) await onFiles(fs);
      });
      const b = h('button', { type: 'button', class: cls, onclick: () => inp.click() }, text);
      return h('div', {}, b, inp);
    },

    button(text, onclick, { cls = 'btn', disabled = false, style } = {}) {
      return h('button', { type: 'button', class: cls, disabled, style, onclick }, text);
    },

    hint(text, style) {
      return h('p', { class: 'hint', style }, text);
    },
  };
}
