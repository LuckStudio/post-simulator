import { canvasSize } from '../../render/context.js';
import { UNSUPPORTED_MSG, pickMime, videoExt } from '../../export/video.js';
import { h } from '../dom.js';

/** Pestaña "Exportar": imágenes, vídeo, HTML/JSON, importar y restablecer. */
export function exportPanel({ store, f, actions }) {
  const mime = pickMime();
  const { W, H } = canvasSize(store.state.format);
  const col = (...kids) => h('div', { class: 'btn-col' }, ...kids);

  return [
    f.group(
      'Imagen',
      `PNG a ${W} × ${H} px, listo para Instagram.`,
      col(
        f.button('Descargar todas las slides (ZIP)', actions.exportPngAll, { cls: 'btn primary' }),
        f.button('Descargar esta slide (PNG)', actions.exportPngCurrent),
      ),
    ),
    f.group(
      'Vídeo animado',
      mime
        ? `Se graba en tiempo real en ${videoExt(mime).toUpperCase()}. Mantén la pestaña visible mientras graba.`
        : UNSUPPORTED_MSG,
      col(
        f.button('Un vídeo por slide (ZIP)', () => actions.exportVideo('each'), {
          cls: 'btn primary',
          disabled: !mime,
        }),
        f.button('Vídeo de esta slide', () => actions.exportVideo('current'), { disabled: !mime }),
        f.button('Vídeo continuo del carrusel', () => actions.exportVideo('all'), { disabled: !mime }),
      ),
      f.seg('Fotogramas por segundo', 'anim.fps', { 30: '30 fps', 60: '60 fps' }, { rebuild: false }),
    ),
    f.group(
      'Código y proyecto',
      null,
      col(
        f.button('Descargar HTML del carrusel', actions.exportHtml),
        f.button('Descargar proyecto (JSON)', actions.exportJson),
      ),
      f.hint(
        'El HTML es un visor del carrusel que se puede abrir en cualquier navegador y también se puede volver a importar aquí.',
        'margin-top:10px',
      ),
    ),
    f.group(
      'Importar',
      null,
      f.button('Abrir proyecto (JSON o HTML)', actions.openImport),
      f.hint('Sustituye el carrusel actual.', 'margin-top:10px'),
    ),
    f.group(
      'Empezar de cero',
      null,
      f.button(
        'Restablecer el ejemplo',
        () => {
          if (confirm('Se perderán los cambios que no hayas exportado. ¿Continuar?')) actions.reset();
        },
        { cls: 'btn danger' },
      ),
    ),
  ];
}
