import { REACTIONS } from '../../core/constants.js';
import { readImage } from '../../io/images.js';
import { h } from '../dom.js';

/** Pestaña "Publicación": autor, texto, ajuste del texto y reacciones. */
export function postPanel({ store, f }) {
  const { post: P, author: A, stats: ST } = store.state;
  const px = (v) => v + ' px';

  return [
    f.group(
      'Autor',
      null,
      f.text('Nombre', 'author.name'),
      f.text('Titular', 'author.headline'),
      h('div', { class: 'row2' }, f.text('Tiempo', 'author.time'), f.text('Iniciales', 'author.initials')),
      f.seg('Forma del avatar', 'author.shape', { square: 'Empresa (cuadrado)', circle: 'Persona (círculo)' }),
      h(
        'div',
        { class: 'row2' },
        f.file(A.avatar ? 'Cambiar avatar' : 'Subir avatar', 'image/*', false, async (fs) => {
          f.set('author.avatar', await readImage(fs[0], 600), { rebuild: true });
        }),
        A.avatar
          ? f.button('Quitar avatar', () => f.set('author.avatar', null, { rebuild: true }), { cls: 'btn ghost' })
          : f.color('Color de iniciales', 'author.avatarColor'),
      ),
      f.toggle('Botón “Seguir”', 'author.follow'),
      f.toggle('Icono de visibilidad pública', 'author.globe'),
    ),

    f.group(
      'Texto del post',
      'Los hashtags, menciones y enlaces se colorean como en un post real. Selecciona texto para ponerlo en negrita, cursiva, etc.: son letras especiales que funcionan al pegarlas en LinkedIn.',
      f.richText('Texto', 'post.text', { rows: 14 }),
      f.toggle('Resaltar hashtags, menciones y enlaces', 'post.hashtags'),
    ),

    f.group(
      'Si el texto no cabe',
      null,
      f.seg('', 'post.fit', { split: 'Dividir en slides', auto: 'Ajuste automático', manual: 'Tamaño fijo' }),
      P.fit === 'split' && [
        f.range('Tamaño del texto', 'post.size', { min: 20, max: 60, fmt: px }),
        f.toggle('Repetir la cabecera en cada slide', 'post.repeatHeader'),
        f.toggle('Reacciones en todas las slides', 'post.footerEvery'),
      ],
      P.fit === 'auto' && [
        f.hint('Busca el tamaño más grande que cabe en una sola slide.'),
        f.range('Tamaño mínimo', 'post.autoMin', { min: 16, max: 40, fmt: px }),
        f.range('Tamaño máximo', 'post.autoMax', { min: 28, max: 80, fmt: px }),
      ],
      P.fit === 'manual' && [
        f.range('Tamaño del texto', 'post.size', { min: 20, max: 72, fmt: px }),
        f.toggle('Cortar con “… más”', 'post.more', { rebuild: true }),
        P.more && f.range('Líneas visibles', 'post.moreLines', { min: 1, max: 20 }),
        f.hint('Si el texto no cabe, se corta y aparece “… más”.'),
      ],
    ),

    f.group(
      'Reacciones y acciones',
      null,
      f.toggle('Mostrar contador de reacciones', 'stats.show', { rebuild: true }),
      ST.show && [
        h(
          'div',
          { class: 'row2' },
          f.number('Reacciones', 'stats.reactions'),
          f.number('Comentarios', 'stats.comments'),
        ),
        f.number('Veces compartido', 'stats.reposts'),
        reactionPicker(f, ST.types),
      ],
      f.toggle('Barra de botones', 'stats.actions', { rebuild: true }),
      ST.actions &&
        h(
          'div',
          { class: 'row2' },
          [0, 1, 2, 3].map((i) => f.text(`Botón ${i + 1}`, `stats.labels.${i}`)),
        ),
    ),
  ];
}

/** Chips para elegir hasta 3 iconos de reacción (al pasar de 3, sale el más antiguo). */
function reactionPicker(f, types) {
  const toggle = (k) => {
    let t = [...types];
    if (t.includes(k)) t = t.filter((x) => x !== k);
    else {
      t.push(k);
      if (t.length > 3) t.shift();
    }
    f.set('stats.types', t, { rebuild: true });
  };
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'lbl' }, 'Iconos de reacción (hasta 3)'),
    h(
      'div',
      { class: 'chips' },
      Object.entries(REACTIONS).map(([k, r]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': types.includes(k) ? 'true' : 'false',
            onclick: () => toggle(k),
          },
          r.l,
        ),
      ),
    ),
  );
}
