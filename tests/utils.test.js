import { describe, expect, it } from 'vitest';
import { clamp, fmtN, getPath, setPath, slug } from '../src/core/utils.js';
import { hexA, lum } from '../src/core/color.js';
import { serializeProject, parseProjectFile, UserError } from '../src/io/project.js';
import { animTypesFor, ELEMENT_KEYS, PRESETS } from '../src/animation/presets.js';

describe('utilidades', () => {
  it('slug genera nombres de archivo seguros', () => {
    expect(slug('Diseñador/a de Producto Senior')).toBe('disenador-a-de-producto-senior');
    expect(slug('')).toBe('carrusel');
  });
  it('clamp, fmtN, getPath y setPath', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(fmtN(12345.6)).toMatch(/12.?346/);
    const o = { a: { b: [1, 2] } };
    setPath(o, 'a.b.1', 9);
    expect(getPath(o, 'a.b.1')).toBe(9);
  });
  it('colores', () => {
    expect(hexA('#FF0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    expect(hexA('nope', 1)).toBe('rgba(10,102,194,1)');
    expect(lum('#000000')).toBe(0);
    expect(lum('#FFFFFF')).toBeCloseTo(1);
  });
});

describe('proyecto', () => {
  it('el JSON exportado se puede volver a leer', () => {
    const data = parseProjectFile('p.json', serializeProject({ format: '1:1' }));
    expect(data).toEqual({ format: '1:1', _app: 'carrusel-ofertas' });
  });
  it('un archivo no válido lanza un error para el usuario', () => {
    expect(() => parseProjectFile('p.json', '{roto')).toThrow(UserError);
  });
});

describe('presets', () => {
  it('cada preset define todos los elementos', () => {
    for (const p of Object.values(PRESETS)) expect(Object.keys(p.el).sort()).toEqual([...ELEMENT_KEYS].sort());
  });
  it('solo los elementos de texto ofrecen animaciones de texto', () => {
    const has = (k, t) => animTypesFor(k).some(([x]) => x === t);
    expect(has('text', 'typewriter')).toBe(true);
    expect(has('header', 'typewriter')).toBe(false);
    expect(has('stats', 'count-up')).toBe(true);
    expect(has('text', 'count-up')).toBe(false);
  });
});
