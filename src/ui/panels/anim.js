import { EASE_LABELS } from '../../animation/easing.js';
import { EL_GROUPS, PRESETS, animTypesFor } from '../../animation/presets.js';
import { h } from '../dom.js';
import { slideDurationControls, videoDurationControls } from './duration.js';

/** Pestaña "Animación": preset, ritmo y animación de cada elemento. */
export function animPanel({ store, f, assets, actions, rerender }) {
  const A = store.state.anim;
  const markCustom = () => {
    store.state.anim.preset = 'custom';
  };

  const presetChips = h(
    'div',
    { class: 'chips' },
    Object.entries(PRESETS).map(([k, p]) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': A.preset === k ? 'true' : 'false',
          onclick: () => actions.applyPreset(k),
        },
        p.label,
      ),
    ),
    A.preset === 'custom' && h('span', { class: 'chip', 'aria-pressed': 'true' }, 'Personalizada'),
  );

  const elementRow = (key, label) => {
    const c = store.state.anim.el[key] || { type: 'fade', dur: 0.6 };
    const isTypewriter = c.type === 'typewriter';
    const sel = h(
      'select',
      { 'aria-label': `Animación de ${label}` },
      animTypesFor(key).map(([v, l]) => h('option', { value: v }, l)),
    );
    sel.value = c.type;
    const rng = h('input', {
      type: 'range',
      min: 0.2,
      max: 3,
      step: 0.05,
      'aria-label': `Duración de ${label}`,
      disabled: isTypewriter || c.type === 'none',
    });
    rng.value = c.dur;
    const out = h('span', {}, isTypewriter ? 'según texto' : c.dur.toFixed(2) + ' s');

    sel.addEventListener('change', () => {
      store.update((s) => {
        s.anim.el[key] = { ...s.anim.el[key], type: sel.value };
        markCustom();
      });
      rerender();
    });
    rng.addEventListener('input', () => {
      store.update((s) => {
        s.anim.el[key] = { ...s.anim.el[key], dur: Number(rng.value) };
        markCustom();
      });
      out.textContent = Number(rng.value).toFixed(2) + ' s';
    });
    return h(
      'div',
      { class: 'el-row' },
      h('span', { class: 'name' }, label),
      h('div', { class: 'ctrls' }, sel, h('div', { class: 'dur' }, rng, out)),
    );
  };

  return [
    f.group(
      'Estilo de animación',
      'Elige un punto de partida y ajusta cada elemento abajo. Se ve en la vista “Animado”.',
      presetChips,
    ),
    f.group(
      'Ritmo',
      null,
      f.seg('Orden', 'anim.order', { cascada: 'En cascada', secuencial: 'Uno tras otro' }, { onSet: markCustom }),
      f.range('Separación entre elementos', 'anim.stagger', {
        min: 0,
        max: 1,
        step: 0.02,
        fmt: (v) => v.toFixed(2) + ' s',
      }),
      f.range('Pausa al final de cada slide', 'anim.hold', {
        min: 0.5,
        max: 8,
        step: 0.1,
        fmt: (v) => v.toFixed(1) + ' s',
      }),
      f.select('Curva', 'anim.ease', EASE_LABELS),
      f.range('Velocidad de escritura', 'anim.cps', { min: 10, max: 120, fmt: (v) => v + ' letras/s' }),
    ),
    ...EL_GROUPS.map(([gname, els]) =>
      f.group(
        gname,
        null,
        els.map(([k, l]) => elementRow(k, l)),
      ),
    ),
    f.group(
      'Duración de las slides',
      'Cuánto se ve cada slide en el vídeo exportado y en la vista “Animado”.',
      ...slideDurationControls({ store, f }),
      store.state.media.type === 'video' && assets.video && videoDurationControls({ store, f, assets }),
    ),
    f.group(
      'Entre slides (vídeo continuo)',
      null,
      f.seg('', 'anim.transition', { deslizar: 'Deslizar', fundido: 'Fundido', corte: 'Corte' }),
    ),
  ];
}
