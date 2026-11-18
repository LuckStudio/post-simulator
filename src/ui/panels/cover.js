import { readImage } from '../../io/images.js';
import { h } from '../dom.js';

/** Pestaña "Portada": una primera slide opcional con título, subtítulo y detalles. */
export function coverPanel({ store, f }) {
  const C = store.state.cover;
  return [
    f.group(
      'Mostrar portada',
      'Una primera slide opcional: título, subtítulo y algunos datos de la publicación.',
      f.toggle('Incluir portada', 'cover.on', { rebuild: true }),
    ),
    C.on && [
      f.group(
        'Diseño',
        null,
        f.seg('', 'cover.layout', { card: 'Tarjeta', full: 'Imagen a sangre' }),
        h(
          'div',
          { class: 'row2' },
          f.file(C.image ? 'Cambiar imagen' : 'Subir imagen', 'image/*', false, async (fs) => {
            f.set('cover.image', await readImage(fs[0]), { rebuild: true });
          }),
          C.image &&
            f.button('Quitar imagen', () => f.set('cover.image', null, { rebuild: true }), { cls: 'btn ghost' }),
        ),
        C.layout === 'full'
          ? f.range('Oscurecer imagen', 'cover.overlay', {
              min: 0,
              max: 0.9,
              step: 0.05,
              fmt: (v) => Math.round(v * 100) + ' %',
            })
          : f.hint('En modo tarjeta, la imagen aparece como franja superior.'),
      ),
      f.group(
        'Contenido',
        null,
        f.text('Etiqueta', 'cover.kicker'),
        f.text('Título', 'cover.role', { area: true, rows: 2 }),
        f.text('Subtítulo', 'cover.company'),
        f.text('Lugar o enlace', 'cover.location', { ph: 'Déjalo vacío para ocultarlo' }),
        f.text('Formato', 'cover.modality', { ph: 'Déjalo vacío para ocultarlo' }),
        f.text('Categoría', 'cover.contract', { ph: 'Déjalo vacío para ocultarlo' }),
        f.text('Dato clave', 'cover.salary', { ph: 'Déjalo vacío para ocultarlo' }),
        f.toggle('Autor en el pie', 'cover.showAuthor'),
        f.text('Invitación a deslizar', 'cover.swipe'),
      ),
    ],
  ];
}
