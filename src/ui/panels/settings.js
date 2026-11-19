import { UI_SETTINGS } from '../../core/uiSettings.js';
import { h } from '../dom.js';

const fmtBytes = (n) =>
  n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';

/**
 * Pestaña "Configuración": ajustes de la propia herramienta (no del proyecto).
 * Los grupos de ajustes salen del registro UI_SETTINGS: un ajuste nuevo aparece aquí solo.
 */
export function settingsPanel({ f, actions }) {
  const ui = actions.ui.get();

  const settingGroups = Object.entries(UI_SETTINGS).map(([key, s]) => {
    const current = ui[key];
    const seg = h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': s.label },
      Object.entries(s.options).map(([value, label]) =>
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': String(value === current),
            onclick: () => actions.ui.set(key, value),
          },
          label,
        ),
      ),
    );
    const optionHint = s.optionHints?.[current];
    return f.group(
      s.label,
      s.hint,
      seg,
      optionHint && h('p', { class: 'hint', style: 'margin-top: 10px' }, optionHint),
    );
  });

  // ----- App y datos -----
  const status = h('p', { class: 'hint' }, 'Comprobando el almacenamiento…');
  const buttons = h('div', { class: 'btn-col' });
  Promise.all([actions.pwa.status(), actions.projects.list().catch(() => null)]).then(([s, list]) => {
    const yes = (b) => (b ? 'sí' : 'no');
    // Una línea por dato (replaceChildren no aplana arrays: se construye la lista ya plana).
    const lines = [
      `Datos protegidos contra borrado automático: ${yes(s.persisted)}`,
      `Disponible sin conexión: ${yes(s.offlineReady)}`,
      `Instalada como app: ${yes(s.standalone)}`,
      actions.projects.available && list && `Proyectos guardados en este dispositivo: ${list.length}`,
      s.usage != null && `Espacio usado: ${fmtBytes(s.usage)}`,
    ].filter(Boolean);
    status.replaceChildren(...lines.flatMap((text, i) => (i ? [h('br'), h('span', {}, text)] : [h('span', {}, text)])));
    buttons.replaceChildren(
      ...[
        !s.persisted && f.button('Proteger mis datos', actions.pwa.protect, { cls: 'btn' }),
        actions.pwa.canInstall() && f.button('Instalar como app', actions.pwa.install, { cls: 'btn primary' }),
      ].filter(Boolean),
    );
  });
  const appGroup = f.group(
    'Esta app y tus datos',
    'El proyecto, los presets y esta configuración se guardan en este navegador. Instalada como app y con los datos protegidos, el navegador no los borra por su cuenta.',
    status,
    buttons,
    f.hint('En iPhone o iPad: Compartir → Añadir a pantalla de inicio.'),
  );

  const resetGroup = f.group(
    'Restablecer',
    null,
    f.button('Volver a la configuración inicial de la herramienta', actions.ui.reset, { cls: 'btn ghost' }),
    f.hint('No toca tu proyecto ni tus presets.'),
  );

  return [...settingGroups, appGroup, resetGroup];
}
