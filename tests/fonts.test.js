import { describe, expect, it } from 'vitest';
import { groupFonts, sanitizeFontName } from '../src/core/fonts.js';
import { fontFamily, fontFn } from '../src/render/context.js';
import { createPrefs } from '../src/state/prefs.js';

describe('groupFonts', () => {
  it('estándar fijas; recientes sin repetir estándar; todas sin repetir las anteriores', () => {
    const g = groupFonts({
      current: 'Georgia',
      recent: ['Verdana', 'Inter', 'Georgia'],
      installed: ['Verdana', 'Arial', 'Inter', 'Zapfino', 'Arial'],
    });
    expect(g.standard.map((s) => s.value)).toEqual(['system', 'inter', 'source']);
    expect(g.recent).toEqual(['Georgia', 'Verdana']);
    expect(g.all).toEqual(['Arial', 'Zapfino']);
  });
  it('si la fuente actual es estándar no aparece en recientes', () => {
    expect(groupFonts({ current: 'inter', recent: [], installed: [] }).recent).toEqual([]);
  });
  it('ordena "todas" alfabéticamente con acentos', () => {
    expect(groupFonts({ current: 'system', installed: ['Zeta', 'Ágora', 'beta'] }).all).toEqual([
      'Ágora',
      'beta',
      'Zeta',
    ]);
  });
});

describe('tipografía en el canvas', () => {
  it('las claves estándar usan su pila', () => {
    expect(fontFamily('inter')).toContain('Inter');
    expect(fontFamily('system')).toContain('-apple-system');
  });
  it('cualquier otro nombre se usa como fuente instalada con la del sistema de reserva', () => {
    expect(fontFamily('Georgia')).toMatch(/^"Georgia", /);
    expect(fontFn('Georgia')(600, 20)).toBe(`600 20px ${fontFamily('Georgia')}`);
  });
  it('limpia caracteres que romperían la declaración', () => {
    expect(fontFamily('Evil"; } body{')).not.toMatch(/[;{}]/);
    expect(fontFamily('')).toContain('-apple-system');
    expect(sanitizeFontName('  A"b\\c;d  ')).toBe('Abcd');
  });
});

describe('prefs', () => {
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
  };
  it('recuerda las tipografías recientes: la última primero, sin repetir y con tope', () => {
    const p = createPrefs(mem());
    for (const n of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) p.addRecentFont(n);
    p.addRecentFont('C');
    expect(p.get().fontsRecent).toEqual(['C', 'G', 'F', 'E', 'D', 'B']);
  });
  it('guarda la lista de fuentes instaladas y sobrevive a datos rotos', () => {
    const st = mem();
    createPrefs(st).setInstalledFonts(['X', 'Y']);
    expect(createPrefs(st).get().fontsInstalled).toEqual(['X', 'Y']);
    st.setItem('carrusel-ofertas-prefs-v1', '{roto');
    expect(createPrefs(st).get()).toEqual({
      fontsRecent: [],
      fontsInstalled: [],
      ui: { appearance: 'system', mobilePreview: 'top', startScreen: 'home', density: 'comfortable' },
      lastProject: null,
      legacyMigrated: false,
    });
  });
});
