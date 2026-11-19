/**
 * Ajustes de la interfaz de la herramienta (no del proyecto): se guardan en este navegador.
 *
 * Cada ajuste es una entrada del registro con sus opciones. La pestaña "Configuración" los
 * pinta todos automáticamente, y cada uno se refleja como un atributo `data-*` en <html>,
 * que el CSS usa para cambiar el aspecto. Para añadir una "forma de ver" la herramienta:
 *   1. añade aquí una entrada con `attr`, `default` y `options`;
 *   2. escribe su CSS con `:root[data-<attr>='<opción>']`.
 * La opción por defecto no pone atributo (así el CSS base es el aspecto por defecto).
 */
export const UI_SETTINGS = {
  appearance: {
    label: 'Apariencia',
    hint: 'Solo cambia la herramienta. El aspecto de las slides se elige en Estilo › Tema.',
    attr: 'theme',
    default: 'system',
    options: {
      system: 'Automática',
      light: 'Clara',
      dark: 'Oscura',
    },
    optionHints: {
      system: 'Sigue el modo claro u oscuro de tu dispositivo.',
    },
  },
  mobilePreview: {
    label: 'Vista previa en el móvil',
    hint: 'Solo afecta a pantallas estrechas. «Flotante» deja los campos a pantalla completa con una vista previa pequeña que se arrastra.',
    attr: 'preview',
    default: 'top',
    options: {
      top: 'Arriba',
      floating: 'Flotante',
    },
    optionHints: {
      top: 'Se ve grande arriba y se encoge a una tira al bajar por los campos.',
      floating: 'Toca la vista previa para verla a pantalla completa.',
    },
  },
  startScreen: {
    label: 'Al abrir la herramienta',
    hint: 'Desde la pantalla de inicio puedes seguir con tu último proyecto, abrir otro o crear uno nuevo.',
    attr: 'start',
    default: 'home',
    options: {
      home: 'Pantalla de inicio',
      editor: 'Seguir editando',
    },
    optionHints: {
      home: 'Ves tus proyectos y eliges con cuál seguir.',
      editor: 'Entras directamente en el último proyecto.',
    },
  },
  density: {
    label: 'Densidad',
    hint: 'La vista compacta reduce espacios y deja más sitio a la vista previa.',
    attr: 'density',
    default: 'comfortable',
    options: {
      comfortable: 'Cómoda',
      compact: 'Compacta',
    },
  },
};

export const DEFAULT_UI = Object.fromEntries(Object.entries(UI_SETTINGS).map(([k, s]) => [k, s.default]));

/** Deja solo ajustes y opciones conocidos; lo demás vuelve al valor por defecto. */
export function normalizeUi(raw) {
  const out = { ...DEFAULT_UI };
  if (raw && typeof raw === 'object') {
    for (const [key, s] of Object.entries(UI_SETTINGS)) {
      if (Object.hasOwn(s.options, raw[key])) out[key] = raw[key];
    }
  }
  return out;
}

/** Atributos `data-*` que corresponden a unos ajustes: { theme: 'dark' | null, … }. */
export function uiAttributes(ui) {
  const n = normalizeUi(ui);
  return Object.fromEntries(
    Object.entries(UI_SETTINGS).map(([key, s]) => [s.attr, n[key] === s.default ? null : n[key]]),
  );
}
