import { STANDARD_FONTS } from '../../core/constants.js';
import { groupFonts, sanitizeFontName } from '../../core/fonts.js';
import { readImage } from '../../io/images.js';
import { isFontInstalled } from '../../io/fonts.js';
import { fontFamily } from '../../render/context.js';
import { h } from '../dom.js';
import { toast } from '../feedback.js';

/** Acentos que se intercambian solos al cambiar de tema (azul legible en claro / en oscuro). */
const ACCENT_LIGHT = '#0A66C2';
const ACCENT_DARK = '#71B7FB';

/** Pestaña "Estilo": formato, tema, tipografía, fondo, tarjeta y márgenes. */
export function stylePanel({ store, f, actions, prefs }) {
  const s = store.state.style;
  const pct = (v) => Math.round(v * 100) + ' %';

  const onTheme = (v) => {
    const a = store.state.style.accent.toUpperCase();
    if (v === 'dark' && a === ACCENT_LIGHT) store.set('style.accent', ACCENT_DARK);
    if (v === 'light' && a === ACCENT_DARK) store.set('style.accent', ACCENT_LIGHT);
  };

  return [
    f.group(
      'Formato',
      null,
      f.seg(
        'Proporción',
        'format',
        { '4:5': '4:5', '1:1': '1:1', '3:4': '3:4', '9:16': '9:16', '16:9': '16:9' },
        { onSet: () => actions.renderFormatSwitch() },
      ),
      f.hint('4:5 (1080 × 1350) es la que más espacio ocupa en el feed de Instagram. 9:16 sirve para stories.'),
    ),
    f.group(
      'Tema',
      null,
      f.seg('', 'style.theme', { light: 'Claro', dark: 'Oscuro' }, { onSet: onTheme }),
      f.color('Color de acento', 'style.accent'),
    ),
    fontGroup({ store, f, actions, prefs }),
    f.group(
      'Fondo de la slide',
      null,
      f.seg('', 'style.bgMode', { theme: 'Del tema', color: 'Color', gradient: 'Degradado', image: 'Imagen' }),
      s.bgMode === 'color' && f.color('Color', 'style.bg'),
      s.bgMode === 'gradient' &&
        h('div', { class: 'row2' }, f.color('Inicio', 'style.bg'), f.color('Final', 'style.bg2')),
      s.bgMode === 'image' && [
        f.file(s.bgImage ? 'Cambiar imagen' : 'Subir imagen', 'image/*', false, async (fs) =>
          f.set('style.bgImage', await readImage(fs[0]), { rebuild: true }),
        ),
        f.range('Oscurecer', 'style.bgDim', { min: 0, max: 0.8, step: 0.05, fmt: pct }),
      ],
    ),
    f.group(
      'Tarjeta y márgenes',
      null,
      f.range('Radio de las esquinas', 'style.radius', { min: 0, max: 48, fmt: (v) => v + ' px' }),
      f.toggle('Sombra', 'style.shadow', { rebuild: true }),
      s.shadow && f.range('Tamaño de la sombra', 'style.shadowBlur', { min: 0, max: 120, fmt: (v) => v + ' px' }),
      f.range('Margen exterior', 'style.margin', { min: 24, max: 160, fmt: (v) => v + ' px' }),
      f.toggle('Número de slide', 'style.pager'),
      f.toggle('Usuario en el pie', 'style.footerHandle'),
    ),
  ];
}

/**
 * Selector de tipografía con tres grupos: estándar, recientes y todas las instaladas.
 * Además permite escribir el nombre de cualquier fuente instalada.
 */
function fontGroup({ store, f, actions, prefs }) {
  const current = store.state.style.font;
  const { recent: recentNames, installed } = (() => {
    const p = prefs.get();
    return { recent: p.fontsRecent, installed: p.fontsInstalled };
  })();
  const { standard, recent, all } = groupFonts({ current, recent: recentNames, installed });
  const isStandard = (v) => STANDARD_FONTS.some(([k]) => k === v);

  const choose = (value) => {
    f.set('style.font', value, {
      rebuild: true,
      onSet: () => {
        if (!isStandard(value)) prefs.addRecentFont(value);
        actions.ensureFontLoaded();
      },
    });
  };

  const option = (name) => h('option', { value: name, style: `font-family: ${fontFamily(name)}` }, name);
  const select = h(
    'select',
    { id: 'font-select', 'aria-label': 'Tipografía' },
    h(
      'optgroup',
      { label: 'Estándar' },
      standard.map((o) => h('option', { value: o.value }, o.label)),
    ),
    recent.length > 0 && h('optgroup', { label: 'Recientes' }, recent.map(option)),
    all.length > 0 && h('optgroup', { label: `Todas las instaladas (${all.length})` }, all.map(option)),
  );
  select.value = current;
  select.addEventListener('change', () => choose(select.value));

  const input = h('input', {
    type: 'text',
    id: 'font-name',
    placeholder: 'Ej.: Georgia',
    'aria-label': 'Nombre de otra fuente instalada',
  });
  const useTyped = () => {
    const name = sanitizeFontName(input.value);
    if (!name) return;
    if (!isFontInstalled(name)) {
      toast(
        `No detecto «${name}» instalada en este dispositivo: si no la tienes, se verá la tipografía del sistema.`,
        true,
      );
    }
    choose(name);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      useTyped();
    }
  });

  return f.group(
    'Tipografía',
    'Elige una de las estándar, una reciente o cualquiera de las instaladas en tu dispositivo.',
    h('div', { class: 'field' }, h('label', { for: 'font-select' }, 'Fuente'), select),
    h(
      'p',
      { class: 'font-sample', style: `font-family: ${fontFamily(current)}`, 'aria-hidden': 'true' },
      'Aa · Diseñador/a de Producto Senior',
    ),
    f.button('Buscar fuentes instaladas', () => actions.detectFonts(), { cls: 'btn' }),
    h(
      'div',
      { class: 'field', style: 'margin-top: 12px' },
      h('label', { for: 'font-name' }, 'O escribe el nombre de otra fuente'),
      h('div', { class: 'inline-row' }, input, f.button('Usar', useTyped, { cls: 'btn ghost' })),
    ),
    f.hint(
      'Las fuentes de tu dispositivo se ven y se exportan aquí. En otro equipo se sustituyen por la del sistema si no las tiene.',
    ),
  );
}
