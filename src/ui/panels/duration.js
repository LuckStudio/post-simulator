import { h } from '../dom.js';

const fmtS = (v) => v.toFixed(1).replace('.', ',') + ' s';

/** Duración de la slide que lleva el vídeo: completo, personalizada o como las demás. */
export function videoDurationControls({ store, f, assets }) {
  const A = store.state.anim;
  const secs = assets.video && Number.isFinite(assets.video.duration) ? assets.video.duration : null;
  const mode = A.videoDuration.mode;

  let note;
  if (mode === 'full') {
    note = secs
      ? `La slide dura lo que el vídeo (${fmtS(secs)}) y se ve entero.`
      : 'La slide durará lo que el vídeo cuando esté cargado.';
  } else if (mode === 'custom' && secs) {
    const d = A.videoDuration.seconds;
    note =
      d > secs + 0.05
        ? `El vídeo dura ${fmtS(secs)}: se repetirá hasta completar los ${fmtS(d)}.`
        : d < secs - 0.05
          ? `El vídeo dura ${fmtS(secs)}: la slide lo corta a los ${fmtS(d)}.`
          : 'La slide dura lo mismo que el vídeo.';
  } else if (mode === 'auto') note = 'Se trata como cualquier otra slide (ver “Duración de las slides”).';

  return [
    f.seg('Duración de la slide con vídeo', 'anim.videoDuration.mode', {
      full: 'Vídeo completo',
      custom: 'Personalizada',
      auto: 'Como las demás',
    }),
    mode === 'custom' && [
      f.range('Segundos', 'anim.videoDuration.seconds', { min: 1, max: 120, step: 0.5, fmt: fmtS }),
      secs &&
        f.button(
          'Igualar a la duración del vídeo',
          () =>
            f.set('anim.videoDuration.seconds', Math.min(120, Math.max(1, Math.round(secs * 2) / 2)), {
              rebuild: true,
            }),
          { cls: 'btn ghost' },
        ),
    ],
    note && h('p', { class: 'hint', style: 'margin-top: 10px' }, note),
  ];
}

/** Duración de cada slide: automática (animación + pausa) o fija. */
export function slideDurationControls({ store, f }) {
  const mode = store.state.anim.duration.mode;
  return [
    f.seg('Cuánto dura cada slide', 'anim.duration.mode', { auto: 'Automática', fixed: 'Fija' }),
    mode === 'fixed'
      ? f.range('Segundos por slide', 'anim.duration.seconds', { min: 1, max: 60, step: 0.5, fmt: fmtS })
      : f.hint('Lo que tarda la animación más la pausa final (se ajusta en “Ritmo”).'),
  ];
}
