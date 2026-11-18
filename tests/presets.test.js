import { describe, expect, it } from 'vitest';
import { PRESETS_KEY } from '../src/core/constants.js';
import { UserError } from '../src/core/errors.js';
import { createDefaultState } from '../src/state/defaults.js';
import {
  DEFAULT_SECTIONS,
  addPreset,
  applyPreset,
  capturePreset,
  createPreset,
  emptyLibrary,
  getDefaultPreset,
  importPresets,
  isPresetFile,
  loadLibrary,
  readPresetFile,
  removePreset,
  renamePreset,
  sanitizePreset,
  saveLibrary,
  serializePresets,
  setDefaultPreset,
  updatePreset,
} from '../src/state/presets.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const base = () => {
  const s = createDefaultState();
  s.style.accent = '#ff0000';
  s.author.name = 'Marca A';
  s.post.text = 'texto de la oferta';
  s.cover.role = 'Puesto X';
  return s;
};
const make = (name = 'Marca A', sections = DEFAULT_SECTIONS, state = base()) =>
  createPreset({ name, state, sections, id: 'p_1', now: 1000 });

describe('crear y aplicar presets', () => {
  it('guarda solo las secciones elegidas, nunca el texto de la oferta', () => {
    const p = make('A', ['style', 'author']);
    expect(Object.keys(p.data).sort()).toEqual(['author', 'format', 'style']);
    expect(p.data.style.accent).toBe('#ff0000');
    expect(JSON.stringify(p)).not.toContain('texto de la oferta');
  });
  it('exige nombre y al menos una sección', () => {
    expect(() => make('   ')).toThrow(UserError);
    expect(() => make('A', [])).toThrow(UserError);
    expect(() => make('A', ['nope'])).toThrow(UserError);
  });
  it('aplicar cambia solo sus secciones y conserva el contenido actual', () => {
    const p = make('A', ['style']);
    const target = createDefaultState();
    target.post.text = 'otro texto';
    target.style.accent = '#00ff00';
    const out = applyPreset(target, p);
    expect(out.style.accent).toBe('#ff0000');
    expect(out.post.text).toBe('otro texto');
    expect(out.author.name).toBe(createDefaultState().author.name);
    expect(target.style.accent).toBe('#00ff00');
  });
  it('un preset incompleto no borra claves nuevas del estado', () => {
    const p = { ...make('A', ['style']), data: { style: { accent: '#123456' } } };
    const out = applyPreset(createDefaultState(), p);
    expect(out.style.accent).toBe('#123456');
    expect(out.style.shadowBlur).toBe(50);
  });
  it('capturePreset copia en profundidad', () => {
    const s = base();
    const d = capturePreset(s, ['anim']);
    d.anim.el.text.type = 'fade';
    expect(s.anim.el.text.type).not.toBe('fade');
  });
});

describe('biblioteca', () => {
  it('guarda y vuelve a cargar desde localStorage', () => {
    const st = memoryStorage();
    saveLibrary(addPreset(emptyLibrary(), make()), st);
    expect(JSON.parse(st.getItem(PRESETS_KEY)).items).toHaveLength(1);
    expect(loadLibrary(st).items[0].name).toBe('Marca A');
  });
  it('un almacenamiento corrupto o vacío da una biblioteca vacía', () => {
    const st = memoryStorage();
    st.setItem(PRESETS_KEY, '{roto');
    expect(loadLibrary(st)).toEqual(emptyLibrary());
    expect(loadLibrary(undefined)).toEqual(emptyLibrary());
  });
  it('los nombres repetidos se numeran', () => {
    let lib = addPreset(emptyLibrary(), make('Marca'));
    lib = addPreset(lib, { ...make('marca'), id: 'p_2' });
    lib = addPreset(lib, { ...make('Marca'), id: 'p_3' });
    expect(lib.items.map((p) => p.name)).toEqual(['Marca', 'marca (2)', 'Marca (3)']);
  });
  it('renombrar, actualizar y eliminar', () => {
    let lib = addPreset(emptyLibrary(), make('A', ['style']));
    lib = renamePreset(lib, 'p_1', 'B');
    expect(lib.items[0].name).toBe('B');
    expect(() => renamePreset(lib, 'p_1', ' ')).toThrow(UserError);
    const s = base();
    s.style.accent = '#abcdef';
    lib = updatePreset(lib, 'p_1', s);
    expect(lib.items[0].data.style.accent).toBe('#abcdef');
    expect(removePreset(lib, 'p_1').items).toHaveLength(0);
  });
  it('el preset estándar se conserva y se limpia al borrarlo', () => {
    let lib = addPreset(emptyLibrary(), make());
    lib = setDefaultPreset(lib, 'p_1');
    expect(getDefaultPreset(lib).id).toBe('p_1');
    expect(getDefaultPreset(removePreset(lib, 'p_1'))).toBeNull();
    expect(setDefaultPreset(lib, 'no-existe').defaultId).toBeNull();
  });
});

describe('importar y exportar', () => {
  it('ida y vuelta de un archivo de presets', () => {
    const text = serializePresets([make('A'), { ...make('B'), id: 'p_2' }]);
    const data = JSON.parse(text);
    expect(isPresetFile(data)).toBe(true);
    const { library, added } = importPresets(addPreset(emptyLibrary(), make('A')), readPresetFile(data));
    expect(added).toBe(2);
    expect(library.items.map((p) => p.name)).toEqual(['A', 'A (2)', 'B']);
    expect(new Set(library.items.map((p) => p.id)).size).toBe(3);
  });
  it('un proyecto normal no se confunde con un archivo de presets', () => {
    expect(isPresetFile({ _app: 'carrusel-ofertas', format: '4:5' })).toBe(false);
    expect(isPresetFile(null)).toBe(false);
  });
  it('rechaza archivos sin presets válidos', () => {
    expect(() => readPresetFile({ presets: [] })).toThrow(UserError);
    expect(() => readPresetFile({ presets: [{ name: 'x', sections: ['nope'], data: {} }] })).toThrow(UserError);
    expect(() => readPresetFile(null)).toThrow(UserError);
  });
  it('descarta claves y secciones que el preset no declara', () => {
    const p = sanitizePreset({
      name: 'X',
      sections: ['style'],
      data: { style: { accent: '#fff' }, post: { text: 'colado' }, cover: { role: 'colado' } },
    });
    expect(Object.keys(p.data)).toEqual(['style']);
  });
  it('un id extraño se sustituye y el nombre se recorta', () => {
    const p = sanitizePreset({ id: '<script>', name: 'N'.repeat(200), sections: ['style'], data: { style: {} } });
    expect(p.id).toMatch(/^p_/);
    expect(p.name).toHaveLength(60);
  });
  it('ignora claves peligrosas de un archivo hostil', () => {
    const hostile = JSON.parse(
      '{"_app":"carrusel-ofertas","kind":"presets","presets":[{"name":"X","sections":["style"],"data":{"style":{"__proto__":{"polluted":true},"accent":"#111111"}}}]}',
    );
    const [p] = readPresetFile(hostile);
    const out = applyPreset(createDefaultState(), p);
    expect(out.style.accent).toBe('#111111');
    expect({}.polluted).toBeUndefined();
    expect(out.style.polluted).toBeUndefined();
  });
});
