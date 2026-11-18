import { readImage } from '../../io/images.js';
import { h } from '../dom.js';

/** Pestaña "Portada": diseño e información del puesto. */
export function coverPanel({ store, f }) {
  const C = store.state.cover;
  return [
    f.group(
      'Mostrar portada',
      'La primera slide: presenta el puesto que se busca.',
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
        f.text('Puesto', 'cover.role', { area: true, rows: 2 }),
        f.text('Empresa', 'cover.company'),
        f.text('Ubicación', 'cover.location'),
        f.text('Modalidad', 'cover.modality'),
        f.text('Jornada o contrato', 'cover.contract'),
        f.text('Salario', 'cover.salary', { ph: 'Déjalo vacío para ocultarlo' }),
        f.toggle('Autor en el pie', 'cover.showAuthor'),
        f.text('Invitación a deslizar', 'cover.swipe'),
      ),
    ],
  ];
}
