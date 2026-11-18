import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../src/state/defaults.js';
import { hydrate } from '../src/state/store.js';
import { migrate } from '../src/state/migrate.js';
import { PRESETS } from '../src/animation/presets.js';

describe('valores estándar', () => {
  const D = DEFAULT_STATE;
  it('avatar en círculo y texto con ajuste automático', () => {
    expect(D.author.shape).toBe('circle');
    expect(D.post.fit).toBe('auto');
  });
  it('contador de reacciones visible con Recomendación, Idea y Corazón', () => {
    expect(D.stats.show).toBe(true);
    expect(D.stats.types).toEqual(['like', 'idea', 'love']);
  });
  it('fondo en degradado #f2f2f2 → #ebedf0 y sombra de 50 px', () => {
    expect(D.style.bgMode).toBe('gradient');
    expect([D.style.bg, D.style.bg2]).toEqual(['#f2f2f2', '#ebedf0']);
    expect(D.style.shadow).toBe(true);
    expect(D.style.shadowBlur).toBe(50);
  });
  it('animación: uno tras otro, curva rápida al inicio y preset Estándar', () => {
    expect(D.anim.order).toBe('secuencial');
    expect(D.anim.ease).toBe('outExpo');
    expect(D.anim.preset).toBe('estandar');
    expect(D.anim.el).toEqual(PRESETS.estandar.el);
  });
  it('el vídeo se ve completo por defecto', () => {
    expect(D.anim.videoDuration.mode).toBe('full');
    expect(D.anim.duration.mode).toBe('auto');
  });
});

describe('migración v1 → v2', () => {
  const OLD = {
    author: { shape: 'square' },
    post: { fit: 'split' },
    stats: { types: ['like', 'love', 'star'] },
    style: { theme: 'light', bgMode: 'theme', bg: '#F4F2EE', bg2: '#DCE4EE' },
    anim: { preset: 'suave', order: 'cascada', ease: 'outCubic', stagger: 0.16 },
  };
  it('lleva a los nuevos estándar lo que seguía con el valor antiguo', () => {
    const s = hydrate(OLD);
    expect(s.author.shape).toBe('circle');
    expect(s.post.fit).toBe('auto');
    expect(s.stats.types).toEqual(['like', 'idea', 'love']);
    expect(s.style.bgMode).toBe('gradient');
    expect(s.style.bg).toBe('#f2f2f2');
    expect(s.anim.order).toBe('secuencial');
    expect(s.anim.ease).toBe('outExpo');
    expect(s.anim.preset).toBe('estandar');
    expect(s.v).toBe(2);
  });
  it('respeta lo que el usuario cambió a mano', () => {
    const s = hydrate({
      ...OLD,
      author: { shape: 'square', name: 'Mi estudio' },
      post: { fit: 'manual' },
      anim: { ...OLD.anim, ease: 'outBack' },
    });
    expect(s.post.fit).toBe('manual');
    expect(s.anim.ease).toBe('outBack');
    expect(s.anim.preset).toBe('suave');
    expect(s.author.name).toBe('Mi estudio');
  });
  it('no cambia el fondo de un proyecto en tema oscuro', () => {
    const s = hydrate({ style: { theme: 'dark', bgMode: 'theme' } });
    expect(s.style.bgMode).toBe('theme');
  });
  it('no toca un proyecto que ya es v2 y no muta la entrada', () => {
    const v2 = { v: 2, author: { shape: 'square' } };
    expect(hydrate(v2).author.shape).toBe('square');
    const input = { ...OLD };
    migrate(input);
    expect(input.author.shape).toBe('square');
  });
});
