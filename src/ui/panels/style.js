import { readImage } from '../../io/images.js';
import { h } from '../dom.js';

/** Acentos que se intercambian solos al cambiar de tema (azul legible en claro / en oscuro). */
const ACCENT_LIGHT = '#0A66C2';
const ACCENT_DARK = '#71B7FB';

/** Pestaña "Estilo": formato, tema, fondo, tarjeta y márgenes. */
export function stylePanel({ store, f, actions }) {
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
      f.select(
        'Tipografía',
        'style.font',
        { system: 'Sistema (como la red social)', inter: 'Inter', source: 'Source Sans 3' },
        { onSet: () => actions.ensureFontLoaded() },
      ),
    ),
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
      f.toggle('Sombra', 'style.shadow'),
      f.range('Margen exterior', 'style.margin', { min: 24, max: 160, fmt: (v) => v + ' px' }),
      f.toggle('Número de slide', 'style.pager'),
      f.toggle('Usuario en el pie', 'style.footerHandle'),
    ),
  ];
}
