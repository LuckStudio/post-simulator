import { DEFAULT_STATE } from '../../state/defaults.js';
import { readImage, readImages } from '../../io/images.js';
import { pdfToImages } from '../../io/pdf.js';
import { toast } from '../feedback.js';
import { h } from '../dom.js';
import { videoDurationControls } from './duration.js';

const pct = (v) => Math.round(v * 100) + ' %';

/** Pestaña "Multimedia": imagen, cuadrícula, vídeo o documento bajo el texto del post. */
export function mediaPanel({ store, f, assets, actions }) {
  const m = store.state.media;
  const video = assets.video;

  const out = [
    f.group(
      'Tipo de multimedia',
      'Va debajo del texto, en la última slide del post.',
      f.seg(
        '',
        'media.type',
        { none: 'Ninguna', image: 'Imagen', grid: 'Cuadrícula', video: 'Vídeo', document: 'Documento' },
        {
          onSet: (v) => {
            if (v !== 'video') assets.video?.pause();
          },
        },
      ),
    ),
  ];

  const aspectSelect = () =>
    f.select('Proporción', 'media.aspect', {
      auto: 'Original',
      '1:1': '1:1 cuadrada',
      '4:5': '4:5 vertical',
      '3:4': '3:4 vertical',
      '16:9': '16:9 horizontal',
      '1.91:1': '1.91:1 horizontal',
    });
  const framing = () => [
    f.range('Zoom', 'media.zoom', { min: 1, max: 3, step: 0.01, fmt: pct }),
    h(
      'div',
      { class: 'row2' },
      f.range('Encuadre horizontal', 'media.fx', { min: 0, max: 1, step: 0.01, fmt: pct }),
      f.range('Encuadre vertical', 'media.fy', { min: 0, max: 1, step: 0.01, fmt: pct }),
    ),
  ];
  const addImages = (max) => async (fs) => {
    f.set('media.items', [...m.items, ...(await readImages(fs, max))], { rebuild: true });
  };

  if (m.type === 'image') {
    out.push(
      f.group(
        'Imagen',
        null,
        f.file(
          m.items.length ? 'Cambiar imagen' : 'Subir imagen',
          'image/*',
          false,
          async (fs) => f.set('media.items', [await readImage(fs[0])], { rebuild: true }),
          'btn primary',
        ),
        m.items.length
          ? [
              aspectSelect(),
              ...framing(),
              f.button('Quitar imagen', () => f.set('media.items', [], { rebuild: true }), { cls: 'btn ghost' }),
            ]
          : f.hint('Sube una imagen para verla en el post.'),
      ),
    );
  }

  if (m.type === 'grid') {
    out.push(
      f.group(
        'Imágenes',
        'De 2 a 5 se ven todas; a partir de 6 aparece “+N” en la última.',
        thumbEditor(f, m.items),
        f.file('Añadir imágenes', 'image/*', true, addImages(1600), 'btn primary'),
        m.items.length && aspectSelect(),
      ),
    );
  }

  if (m.type === 'video') {
    out.push(
      f.group(
        'Vídeo',
        'El vídeo no se guarda en el JSON ni en el HTML; tendrás que volver a subirlo al importar.',
        f.file(
          video ? 'Cambiar vídeo' : 'Subir vídeo',
          'video/*',
          false,
          (fs) => actions.setVideo(fs[0]),
          'btn primary',
        ),
        video && [
          aspectSelect(),
          f.range('Fotograma en la imagen estática', 'media.videoTime', {
            min: 0,
            max: Math.max(0.1, Math.floor((video.duration || 1) * 10) / 10),
            step: 0.1,
            fmt: (v) => v.toFixed(1) + ' s',
          }),
          f.toggle('Botón de reproducir en la imagen', 'media.playIcon'),
          ...framing(),
        ],
      ),
    );
    if (video) {
      out.push(
        f.group(
          'Duración en la versión animada',
          'Cuánto tiempo se ve la slide con el vídeo en el vídeo exportado y en la vista “Animado”.',
          ...videoDurationControls({ store, f, assets }),
        ),
      );
    }
  }

  if (m.type === 'document') {
    const onPdf = async (fs) => {
      toast('Convirtiendo el PDF…');
      try {
        const { pages, truncated } = await pdfToImages(fs[0]);
        f.set('media.items', pages, { rebuild: true });
        const title = store.state.media.docTitle;
        if (!title || title === DEFAULT_STATE.media.docTitle) {
          f.set('media.docTitle', fs[0].name.replace(/\.pdf$/i, ''), { rebuild: true });
        }
        toast(truncated ? 'Se han importado las primeras 30 páginas.' : `${pages.length} páginas importadas.`);
      } catch {
        toast('No se pudo leer el PDF. Prueba a subir las páginas como imágenes.', true);
      }
    };
    out.push(
      f.group(
        'Documento',
        'Sube un PDF o varias imágenes como páginas.',
        f.text('Título', 'media.docTitle'),
        thumbEditor(f, m.items),
        h(
          'div',
          { class: 'row2' },
          f.file('Subir PDF', 'application/pdf', false, onPdf, 'btn primary'),
          f.file('Añadir imágenes', 'image/*', true, addImages(1600)),
        ),
        m.items.length > 1 && [
          f.range('Página visible', 'media.docPage', {
            min: 0,
            max: m.items.length - 1,
            fmt: (v) => v + 1 + ' de ' + m.items.length,
          }),
          f.toggle('Pasar páginas solas en la versión animada', 'media.docAuto'),
        ],
        m.items.length && aspectSelect(),
      ),
    );
  }

  return out;
}

/** Miniaturas reordenables / eliminables de las imágenes del post. */
function thumbEditor(f, items) {
  if (!items.length) return null;
  const update = (fn) => {
    const a = [...items];
    fn(a);
    f.set('media.items', a, { rebuild: true });
  };
  return h(
    'div',
    { class: 'thumbs-edit' },
    items.map((src, i) =>
      h(
        'figure',
        {},
        h('img', { src, alt: `Imagen ${i + 1}` }),
        h(
          'div',
          { class: 'ctl' },
          h(
            'button',
            {
              type: 'button',
              'aria-label': 'Mover a la izquierda',
              onclick: () => i > 0 && update((a) => ([a[i - 1], a[i]] = [a[i], a[i - 1]])),
            },
            '‹',
          ),
          h('button', { type: 'button', 'aria-label': 'Quitar', onclick: () => update((a) => a.splice(i, 1)) }, '✕'),
          h(
            'button',
            {
              type: 'button',
              'aria-label': 'Mover a la derecha',
              onclick: () => i < items.length - 1 && update((a) => ([a[i + 1], a[i]] = [a[i], a[i + 1]])),
            },
            '›',
          ),
        ),
      ),
    ),
  );
}
