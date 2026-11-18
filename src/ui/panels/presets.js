import { DEFAULT_SECTIONS, PRESET_SECTIONS, getDefaultPreset } from '../../state/presets.js';
import { h } from '../dom.js';
import { svgIcon } from '../icons.js';

/** Borrador del formulario "Guardar": se conserva al repintar el panel. */
const draft = { name: '', sections: new Set(DEFAULT_SECTIONS) };

const fmtDate = (ts) => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtBytes = (n) =>
  n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';

/** Pestaña "Presets": guardar, aplicar, importar y exportar ajustes; estado de la app y los datos. */
export function presetsPanel({ f, actions }) {
  const P = actions.presets;
  const lib = P.library();
  const standard = getDefaultPreset(lib);

  // ----- Guardar los ajustes actuales -----
  const nameInput = h('input', {
    type: 'text',
    id: 'preset-name',
    maxlength: 60,
    placeholder: 'Ej.: Estudio Norte · estilo estándar',
    value: draft.name,
  });
  nameInput.addEventListener('input', () => (draft.name = nameInput.value));
  const selected = () => [...draft.sections];
  const save = () => {
    if (P.save({ name: draft.name, sections: selected() })) draft.name = '';
  };
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });
  const checks = Object.entries(PRESET_SECTIONS).map(([key, { label }]) => {
    const cb = h('input', { type: 'checkbox' });
    cb.checked = draft.sections.has(key);
    cb.addEventListener('change', () => (cb.checked ? draft.sections.add(key) : draft.sections.delete(key)));
    return h('label', { class: 'check-row' }, cb, h('span', {}, label));
  });

  const saveGroup = f.group(
    'Guardar los ajustes actuales',
    'Un preset recuerda cómo se ve tu carrusel, no el texto de la oferta, para reutilizarlo con un clic.',
    h('div', { class: 'field' }, h('label', { for: 'preset-name' }, 'Nombre'), nameInput),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Qué incluir'), h('div', { class: 'checks' }, checks)),
    h(
      'div',
      { class: 'btn-col' },
      f.button('Guardar preset', save, { cls: 'btn primary' }),
      f.button('Exportar estos ajustes sin guardar', () => P.exportCurrent(selected()), { cls: 'btn ghost' }),
    ),
  );

  // ----- Lista -----
  const iconBtn = (icon, label, onclick, pressed) =>
    h(
      'button',
      {
        type: 'button',
        class: 'btn icon sm',
        'aria-label': label,
        title: label,
        'aria-pressed': pressed == null ? null : String(pressed),
        onclick,
      },
      svgIcon(icon, 18),
    );

  const card = (p) =>
    h(
      'article',
      { class: 'preset-card' },
      h(
        'div',
        { class: 'preset-head' },
        h('strong', {}, p.name),
        lib.defaultId === p.id && h('span', { class: 'tag accent' }, 'Al empezar'),
      ),
      h(
        'div',
        { class: 'tags' },
        p.sections.map((s) => h('span', { class: 'tag' }, PRESET_SECTIONS[s].label)),
      ),
      h('p', { class: 'preset-date' }, `Guardado el ${fmtDate(p.updatedAt)}`),
      h(
        'div',
        { class: 'preset-actions' },
        h('button', { type: 'button', class: 'btn sm primary', onclick: () => P.apply(p.id) }, 'Aplicar'),
        iconBtn(
          'star',
          lib.defaultId === p.id ? 'Quitar como preset inicial' : 'Usar al empezar un proyecto nuevo',
          () => P.setDefault(lib.defaultId === p.id ? null : p.id),
          lib.defaultId === p.id,
        ),
        iconBtn('refresh', 'Actualizar con los ajustes actuales', () => P.update(p.id)),
        iconBtn('edit', 'Cambiar el nombre', () => P.rename(p.id)),
        iconBtn('export', 'Exportar este preset', () => P.exportOne(p.id)),
        iconBtn('trash', 'Eliminar', () => P.remove(p.id)),
      ),
    );

  const listGroup = f.group(
    `Mis presets${lib.items.length ? ` (${lib.items.length})` : ''}`,
    standard
      ? `«${standard.name}» se aplica al empezar un proyecto nuevo o al restablecer el ejemplo.`
      : 'Marca uno con la estrella para que se aplique al empezar un proyecto nuevo.',
    lib.items.length
      ? h('div', { class: 'preset-list' }, lib.items.map(card))
      : h(
          'p',
          { class: 'note' },
          'Todavía no has guardado ningún preset. Guarda los ajustes actuales arriba o importa un archivo.',
        ),
  );

  // ----- Importar y exportar -----
  const ioGroup = f.group(
    'Importar y exportar',
    'Pasa tus presets y estilos a otro navegador, equipo o compañero con un archivo JSON.',
    h(
      'div',
      { class: 'btn-col' },
      f.button('Importar presets o estilos (JSON)', P.openImport),
      f.button('Exportar todos los presets', P.exportAll, { cls: 'btn ghost', disabled: !lib.items.length }),
    ),
  );

  // ----- App y datos -----
  const status = h('p', { class: 'hint' }, 'Comprobando el almacenamiento…');
  const buttons = h('div', { class: 'btn-col' });
  actions.pwa.status().then((s) => {
    const yes = (b) => (b ? 'sí' : 'no');
    status.replaceChildren(
      h('span', {}, `Datos protegidos contra borrado automático: ${yes(s.persisted)}`),
      h('br'),
      h('span', {}, `Disponible sin conexión: ${yes(s.offlineReady)}`),
      h('br'),
      h('span', {}, `Instalada como app: ${yes(s.standalone)}`),
      s.usage != null && [h('br'), h('span', {}, `Espacio usado: ${fmtBytes(s.usage)}`)],
    );
    buttons.replaceChildren(
      ...[
        !s.persisted && f.button('Proteger mis datos', actions.pwa.protect, { cls: 'btn' }),
        actions.pwa.canInstall() && f.button('Instalar como app', actions.pwa.install, { cls: 'btn primary' }),
      ].filter(Boolean),
    );
  });
  const appGroup = f.group(
    'Esta app y tus datos',
    'Los presets y el proyecto se guardan en este navegador. Instalada como app y con los datos protegidos, el navegador no los borra por su cuenta.',
    status,
    buttons,
    f.hint('En iPhone o iPad: Compartir → Añadir a pantalla de inicio.'),
  );

  return [saveGroup, listGroup, ioGroup, appGroup];
}
