import { describe, expect, it } from 'vitest';
import { computeTimeline } from '../src/animation/timeline.js';
import { PRESETS } from '../src/animation/presets.js';
import { createDefaultState } from '../src/state/defaults.js';

const slide = (...keys) => ({
  items: [{ key: 'card', children: keys.map((key) => ({ key, chars: 90 })) }],
});
const anim = (over = {}) => ({ ...createDefaultState().anim, ...over });

describe('computeTimeline', () => {
  it('el primer elemento empieza a los 0,15 s y la slide suma la pausa final', () => {
    const s = computeTimeline(slide('header'), anim({ hold: 2 }));
    expect(s.items[0]._start).toBe(0.15);
    const last = s.items[0].children[0];
    expect(s.total).toBeCloseTo(last._start + last._dur + 2);
  });

  it('en cascada separa los inicios según el stagger', () => {
    const s = computeTimeline(slide('header', 'text', 'stats'), anim({ order: 'cascada', stagger: 0.3 }));
    const [h, t, st] = s.items[0].children;
    expect(t._start - h._start).toBeCloseTo(0.3);
    expect(st._start - t._start).toBeCloseTo(0.3);
  });

  it('en secuencial cada elemento espera (casi) al anterior', () => {
    const s = computeTimeline(slide('header', 'text'), anim({ order: 'secuencial' }));
    const [h, t] = s.items[0].children;
    expect(t._start).toBeCloseTo(h._start + h._dur - 0.05);
  });

  it('la máquina de escribir dura según los caracteres y la velocidad', () => {
    const el = { ...PRESETS.suave.el, text: { type: 'typewriter', dur: 1 } };
    const s = computeTimeline(slide('text'), anim({ el, cps: 45 }));
    expect(s.items[0].children[0]._dur).toBeCloseTo(90 / 45);
  });

  it('degrada a fundido las animaciones de texto en elementos que no son texto', () => {
    const el = { ...PRESETS.suave.el, header: { type: 'words', dur: 1 }, media: { type: 'count-up', dur: 1 } };
    const s = computeTimeline(slide('header', 'media'), anim({ el }));
    expect(s.items[0].children.map((c) => c._type)).toEqual(['fade', 'fade']);
  });

  it('las tarjetas duplicadas del cierre ("card2") usan la configuración de "card"', () => {
    const el = { ...PRESETS.suave.el, card: { type: 'blur', dur: 1 } };
    const s = computeTimeline({ items: [{ key: 'card' }, { key: 'card2' }] }, anim({ el }));
    expect(s.items[1]._type).toBe('blur');
  });
});
