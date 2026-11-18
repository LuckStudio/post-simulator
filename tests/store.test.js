import { describe, expect, it, vi } from 'vitest';
import { createStore, deepMerge, hydrate } from '../src/state/store.js';
import { DEFAULT_STATE } from '../src/state/defaults.js';

describe('deepMerge', () => {
  it('mezcla objetos y respeta las claves por defecto que faltan', () => {
    const out = deepMerge({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 9 } });
    expect(out).toEqual({ a: 1, b: { c: 9, d: 3 } });
  });
  it('sustituye los arrays enteros', () => {
    expect(deepMerge({ a: [1, 2, 3] }, { a: [4] })).toEqual({ a: [4] });
  });
  it('ignora un array si la base no lo es y viceversa', () => {
    expect(deepMerge({ a: [1] }, { a: 'x' })).toEqual({ a: [1] });
  });
  it('conserva claves nuevas', () => {
    expect(deepMerge({ a: 1 }, { z: 2 })).toEqual({ a: 1, z: 2 });
  });
  it('no muta la base', () => {
    const base = { a: { b: 1 } };
    deepMerge(base, { a: { b: 2 } });
    expect(base.a.b).toBe(1);
  });
});

describe('hydrate', () => {
  it('completa un proyecto parcial con los valores por defecto', () => {
    const s = hydrate({ cover: { role: 'Backend' } });
    expect(s.cover.role).toBe('Backend');
    expect(s.cover.company).toBe(DEFAULT_STATE.cover.company);
    expect(s.anim.el.text).toEqual(DEFAULT_STATE.anim.el.text);
  });
  it('quita la marca _app del JSON exportado', () => {
    expect(hydrate({ _app: 'carrusel-ofertas' })._app).toBeUndefined();
  });
  it('acepta basura sin romperse', () => {
    expect(hydrate(null).format).toBe('4:5');
  });
});

describe('createStore', () => {
  it('set escribe por ruta y notifica', () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.set('stats.labels.2', 'Difundir');
    expect(store.state.stats.labels[2]).toBe('Difundir');
    expect(fn).toHaveBeenCalledWith(store.state, 'set');
  });
  it('replace normaliza y avisa con motivo "replace"', () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.replace({ format: '1:1' });
    expect(store.state.format).toBe('1:1');
    expect(store.state.post.fit).toBe('split');
    expect(fn.mock.calls[0][1]).toBe('replace');
  });
  it('reset no comparte referencias con los valores por defecto', () => {
    const store = createStore();
    store.reset();
    store.state.stats.types.push('idea');
    expect(DEFAULT_STATE.stats.types).not.toContain('idea');
  });
  it('subscribe devuelve una función para darse de baja', () => {
    const store = createStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.set('format', '1:1');
    expect(fn).not.toHaveBeenCalled();
  });
});
