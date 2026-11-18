import { describe, expect, it } from 'vitest';
import { computeTimeline, resolveSlideDuration } from '../src/animation/timeline.js';
import { createDefaultState } from '../src/state/defaults.js';

const anim = (over = {}) => ({ ...createDefaultState().anim, hold: 2, ...over });
const r = (o) =>
  resolveSlideDuration({ animEnd: 3, anim: anim(o.anim), hasVideo: o.hasVideo, videoSeconds: o.videoSeconds });

describe('resolveSlideDuration', () => {
  it('automática: animación + pausa final', () => {
    expect(r({})).toBe(5);
  });
  it('fija: los segundos indicados, con límites de 1 a 300 s', () => {
    expect(r({ anim: { duration: { mode: 'fixed', seconds: 8 } } })).toBe(8);
    expect(r({ anim: { duration: { mode: 'fixed', seconds: 0 } } })).toBe(1);
    expect(r({ anim: { duration: { mode: 'fixed', seconds: 9999 } } })).toBe(300);
    expect(r({ anim: { duration: { mode: 'fixed', seconds: 'abc' } } })).toBe(1);
  });
  it('vídeo completo: dura lo que el vídeo (o la animación, si es más larga)', () => {
    const a = { videoDuration: { mode: 'full', seconds: 10 } };
    expect(r({ anim: a, hasVideo: true, videoSeconds: 12.4 })).toBeCloseTo(12.6);
    expect(r({ anim: a, hasVideo: true, videoSeconds: 1 })).toBeCloseTo(3.2);
  });
  it('vídeo personalizado: más o menos que el vídeo', () => {
    const a = { videoDuration: { mode: 'custom', seconds: 20 } };
    expect(r({ anim: a, hasVideo: true, videoSeconds: 5 })).toBe(20);
    expect(r({ anim: { videoDuration: { mode: 'custom', seconds: 2 } }, hasVideo: true, videoSeconds: 30 })).toBe(2);
  });
  it('vídeo en automático o sin duración conocida: como las demás slides', () => {
    expect(r({ anim: { videoDuration: { mode: 'auto', seconds: 9 } }, hasVideo: true, videoSeconds: 30 })).toBe(5);
    expect(r({ hasVideo: true, videoSeconds: NaN })).toBe(5);
    expect(r({ hasVideo: true, videoSeconds: Infinity })).toBe(5);
  });
  it('la duración de vídeo solo afecta a la slide que lo lleva', () => {
    const a = { videoDuration: { mode: 'custom', seconds: 20 } };
    expect(r({ anim: a, hasVideo: false })).toBe(5);
  });
  it('la duración fija de las slides no pisa a la del vídeo', () => {
    const a = { duration: { mode: 'fixed', seconds: 4 }, videoDuration: { mode: 'custom', seconds: 15 } };
    expect(r({ anim: a, hasVideo: true })).toBe(15);
    expect(r({ anim: a, hasVideo: false })).toBe(4);
  });
});

describe('computeTimeline con duración', () => {
  const slide = (hasVideo) => ({ hasVideo, items: [{ key: 'card', children: [{ key: 'header' }] }] });
  it('usa la duración del vídeo que recibe', () => {
    const s = computeTimeline(slide(true), anim({ videoDuration: { mode: 'full', seconds: 1 } }), { videoSeconds: 30 });
    expect(s.total).toBeCloseTo(30.2);
  });
  it('sin vídeo, la configuración de vídeo no cuenta', () => {
    const s = computeTimeline(slide(false), anim({ duration: { mode: 'fixed', seconds: 7 } }), { videoSeconds: 30 });
    expect(s.total).toBe(7);
  });
});
