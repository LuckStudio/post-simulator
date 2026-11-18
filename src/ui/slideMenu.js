/**
 * Entradas del menú contextual de una slide (o del hueco de una portada/cierre ocultos).
 * Todo lo que hace pasa por el store o las acciones de la app; aquí solo se decide qué ofrecer.
 */

const FIT_LABELS = {
  auto: 'Texto: ajustar el tamaño automáticamente',
  split: 'Texto: dividir en varias slides',
  manual: 'Texto: tamaño fijo',
};
const MEDIA_LABELS = { image: 'imagen', grid: 'imágenes', video: 'vídeo', document: 'documento' };

/**
 * @param {{target:{kind:'slide',index:number}|{kind:'ghost',which:'cover'|'cta'},
 *          store:object, panels:object, preview:object, actions:object, toast:Function}} deps
 * @returns {{title:string, items:object[]}}
 */
export function buildSlideMenu({ target, store, panels, preview, actions, toast }) {
  const state = store.state;
  const go = (id) => () => panels.select(id, { reveal: true });
  const edit = (label, id, icon = 'edit') => ({ label, icon, onSelect: go(id), onSelectMovesFocus: true });
  const change = (path, value) => () => {
    store.set(path, value);
    panels.render();
  };
  const SEP = { separator: true };

  if (target.kind === 'ghost') {
    const isCover = target.which === 'cover';
    return {
      title: isCover ? 'Portada oculta' : 'Cierre oculto',
      items: [
        {
          label: isCover ? 'Mostrar portada' : 'Mostrar cierre',
          icon: 'eye',
          onSelect: change(isCover ? 'cover.on' : 'cta.on', true),
        },
        edit(isCover ? 'Editar portada' : 'Editar cierre', isCover ? 'cover' : 'cta'),
      ],
    };
  }

  const { slides } = preview.carousel;
  const slide = slides[target.index];
  if (!slide) return { title: 'Slide', items: [] };
  const i = target.index;
  const items = [];

  if (slide.type === 'cover') {
    items.push(edit('Editar portada', 'cover'), {
      label: 'Ocultar portada',
      icon: 'eyeOff',
      onSelect: () => {
        change('cover.on', false)();
        toast('Portada oculta. Para volver a mostrarla, usa el hueco punteado de la tira de slides.');
      },
    });
  }

  if (slide.type === 'post') {
    items.push(edit('Editar texto del post', 'post'));
    if (slide.hasMedia) items.push(edit(`Editar ${MEDIA_LABELS[state.media.type] ?? 'multimedia'}`, 'media', 'media'));
    if (slide.hasVideo) items.push(edit('Duración del vídeo…', 'media', 'video'));
    items.push(SEP);
    for (const [fit, label] of Object.entries(FIT_LABELS)) {
      items.push({ label, radio: true, checked: state.post.fit === fit, onSelect: change('post.fit', fit) });
    }
    items.push(
      SEP,
      { label: 'Mostrar reacciones', checked: state.stats.show, onSelect: change('stats.show', !state.stats.show) },
      {
        label: 'Mostrar barra de botones',
        checked: state.stats.actions,
        onSelect: change('stats.actions', !state.stats.actions),
      },
    );
  }

  if (slide.type === 'cta') {
    const mode = state.cta.mode;
    items.push(edit('Editar cierre', 'cta'));
    if (mode === 'both') {
      items.push({ label: 'Separar en dos slides', icon: 'split', onSelect: change('cta.mode', 'separate') });
    }
    if (mode === 'separate') {
      const [only] = slide.parts;
      items.push(
        { label: 'Juntar en una sola slide', icon: 'split', onSelect: change('cta.mode', 'both') },
        {
          label: `Quitar esta slide (dejar solo ${only === 'seek' ? 'contactar' : 'seguir'})`,
          icon: 'eyeOff',
          onSelect: change('cta.mode', only === 'seek' ? 'offer' : 'seek'),
        },
      );
    }
    if (mode === 'seek' || mode === 'offer') {
      items.push({
        label: mode === 'seek' ? 'Añadir el mensaje para contactar' : 'Añadir el mensaje para seguir',
        icon: 'plus',
        onSelect: change('cta.mode', 'both'),
      });
    }
    items.push({
      label: 'Ocultar cierre',
      icon: 'eyeOff',
      onSelect: () => {
        change('cta.on', false)();
        toast('Cierre oculto. Para volver a mostrarlo, usa el hueco punteado de la tira de slides.');
      },
    });
  }

  items.push(
    SEP,
    edit('Ajustes de animación', 'anim', 'anim'),
    { label: 'Reproducir animación', icon: 'play', onSelect: () => preview.playSlide(i) },
    SEP,
    {
      label: 'Descargar imagen (PNG)',
      icon: 'export',
      onSelect: () => {
        preview.go(i);
        actions.exportPngCurrent();
      },
    },
    {
      label: 'Descargar vídeo de esta slide',
      icon: 'video',
      onSelect: () => {
        preview.go(i);
        actions.exportVideo('current');
      },
    },
    { label: 'Copiar imagen', icon: 'copy', onSelect: () => actions.copySlideImage(i) },
  );

  return { title: `${slide.label} · ${i + 1} de ${slides.length}`, items };
}
