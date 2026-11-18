import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../src/state/defaults.js';
import { hydrate } from '../src/state/store.js';
import { OLD_DEMO_TEXT, migrate } from '../src/state/migrate.js';
import { PRESETS } from '../src/animation/presets.js';
import { DEMO_TEXT } from '../src/state/defaults.js';

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
    expect(s.v).toBe(3);
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

describe('contenido de ejemplo genérico', () => {
  const D = DEFAULT_STATE;
  const texts = () =>
    JSON.stringify(
      [D.author, D.post, D.cover, D.cta, D.media.docTitle].map((x) => (x.items ? { ...x, items: [] } : x)),
    );
  it('es una publicación libre: una slide con imagen, sin portada ni cierre', () => {
    expect(D.cover.on).toBe(false);
    expect(D.cta.on).toBe(false);
    expect(D.media.type).toBe('image');
    expect(D.media.items).toHaveLength(1);
    expect(D.media.items[0]).toMatch(/^data:image\/svg\+xml,/);
  });
  it('no menciona nombres, marcas ni ofertas reales', () => {
    expect(texts()).not.toMatch(/Norte|Madrid|Figma|empleo|vacante|salari|€|contrat/i);
    expect(D.author.name).toBe('Nombre de la marca');
    expect(D.cta.handle).toBe('@tumarca');
    expect(DEMO_TEXT).toMatch(/ejemplo/);
  });
});

describe('migración v2 → v3', () => {
  it('el ejemplo antiguo sin tocar pasa al nuevo (genérico, sin portada ni cierre, con imagen)', () => {
    const s = hydrate({
      v: 2,
      author: { name: 'Estudio Norte', initials: 'EN' },
      post: { text: OLD_DEMO_TEXT },
      media: { type: 'none', items: [] },
      cover: { on: true, role: 'Diseñador/a de Producto Senior', company: 'Estudio Norte' },
      cta: { on: true, handle: '@estudionorte' },
    });
    expect(s.author.name).toBe(DEFAULT_STATE.author.name);
    expect(s.post.text).toBe(DEFAULT_STATE.post.text);
    expect(s.cover.on).toBe(false);
    expect(s.cta.on).toBe(false);
    expect(s.cover.role).toBe(DEFAULT_STATE.cover.role);
    expect(s.cta.handle).toBe('@tumarca');
    expect(s.media.type).toBe('image');
    expect(s.media.items).toHaveLength(1);
  });
  it('el ejemplo antiguo conserva su imagen si el usuario ya había puesto una', () => {
    const s = hydrate({
      v: 2,
      post: { text: OLD_DEMO_TEXT },
      media: { type: 'image', items: ['data:image/png;base64,AAAA'] },
      cover: { role: 'Diseñador/a de Producto Senior' },
    });
    expect(s.media.items).toEqual(['data:image/png;base64,AAAA']);
  });
  it('un proyecto con contenido propio conserva sus slides y sus textos', () => {
    const s = hydrate({
      v: 2,
      author: { name: 'Mi marca real' },
      post: { text: 'Mi texto' },
      cover: { on: true, role: 'Mi título' },
      cta: { on: true },
    });
    expect(s.author.name).toBe('Mi marca real');
    expect(s.post.text).toBe('Mi texto');
    expect(s.cover.on).toBe(true);
    expect(s.cta.on).toBe(true);
    expect(s.cover.role).toBe('Mi título');
  });
  it('los textos de ejemplo antiguos sin tocar se sustituyen aunque el resto del proyecto sea propio', () => {
    const s = hydrate({
      v: 2,
      author: { name: 'Estudio Norte', headline: 'Estudio de diseño digital en Madrid' },
      post: { text: 'Texto propio' },
    });
    expect(s.author.name).toBe(DEFAULT_STATE.author.name);
    expect(s.author.headline).toBe(DEFAULT_STATE.author.headline);
    expect(s.post.text).toBe('Texto propio');
  });
  it('un proyecto v1 pasa por las dos migraciones', () => {
    const s = hydrate({ author: { shape: 'square', name: 'Estudio Norte' } });
    expect(s.author.shape).toBe('circle');
    expect(s.author.name).toBe(DEFAULT_STATE.author.name);
    expect(s.v).toBe(3);
  });
});
