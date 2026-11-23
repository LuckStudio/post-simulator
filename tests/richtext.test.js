import { describe, expect, it } from 'vitest';
import { splitGraphemes } from '../src/core/graphemes.js';
import {
  clearFormat,
  describeFormat,
  formatRange,
  hasFormat,
  toggleFormat,
  toggleList,
  wordAt,
} from '../src/core/richText.js';

describe('negrita y cursiva (letras Unicode)', () => {
  it('negrita: letras y dígitos; lo demás queda igual', () => {
    expect(toggleFormat('Hola 2026!', 'bold')).toBe('𝗛𝗼𝗹𝗮 𝟮𝟬𝟮𝟲!');
  });
  it('cursiva: solo letras (no hay dígitos en cursiva)', () => {
    expect(toggleFormat('Hola 2026', 'italic')).toBe('𝘏𝘰𝘭𝘢 2026');
  });
  it('negrita y cursiva a la vez dan negrita cursiva, en cualquier orden', () => {
    const a = toggleFormat(toggleFormat('Hola', 'bold'), 'italic');
    const b = toggleFormat(toggleFormat('Hola', 'italic'), 'bold');
    expect(a).toBe('𝙃𝙤𝙡𝙖');
    expect(b).toBe(a);
  });
  it('quitar una de las dos deja la otra', () => {
    const both = toggleFormat(toggleFormat('Hola', 'bold'), 'italic');
    expect(toggleFormat(both, 'bold')).toBe('𝘏𝘰𝘭𝘢');
    expect(toggleFormat(both, 'italic')).toBe('𝗛𝗼𝗹𝗮');
  });
  it('aplicar dos veces el mismo formato lo quita (vuelve al texto original)', () => {
    for (const f of ['bold', 'italic', 'under', 'strike']) {
      expect(toggleFormat(toggleFormat('Texto de prueba 12', f), f), f).toBe('Texto de prueba 12');
    }
  });
  it('si solo una parte está en negrita, se pone todo en negrita (no se quita)', () => {
    const mixed = toggleFormat('Ho', 'bold') + 'la';
    expect(toggleFormat(mixed, 'bold')).toBe('𝗛𝗼𝗹𝗮');
  });
  it('conserva acentos y eñes, y se recuperan al quitar el formato', () => {
    const b = toggleFormat('información año', 'bold');
    expect(b.normalize('NFD')).toContain('́'); // el acento sigue ahí, combinado
    expect(b.startsWith('𝗶𝗻𝗳𝗼𝗿𝗺𝗮𝗰𝗶')).toBe(true);
    expect(toggleFormat(b, 'bold')).toBe('información año');
    expect(clearFormat(b)).toBe('información año');
  });
  it('los saltos de línea y los signos no se tocan', () => {
    expect(toggleFormat('uno\ndos', 'bold')).toBe('𝘂𝗻𝗼\n𝗱𝗼𝘀');
  });
});

describe('subrayado y tachado (marcas combinadas)', () => {
  it('añade una marca tras cada carácter y se quita igual', () => {
    const u = toggleFormat('ab', 'under');
    expect(u).toBe('a̲b̲');
    expect(toggleFormat(u, 'under')).toBe('ab');
    expect(toggleFormat('ab', 'strike')).toBe('a̶b̶');
  });
  it('no marca los saltos de línea ni los emojis', () => {
    expect(toggleFormat('a\nb', 'strike')).toBe('a̶\nb̶');
    expect(toggleFormat('a😀', 'under')).toBe('a̲😀');
  });
  it('combina con negrita', () => {
    const t = toggleFormat(toggleFormat('Hi', 'bold'), 'under');
    expect(t).toBe('𝗛̲𝗶̲');
    expect(toggleFormat(t, 'bold')).toBe('H̲i̲');
  });
});

describe('describeFormat, clearFormat y hasFormat', () => {
  it('detecta el formato aplicado a todo el texto', () => {
    expect(describeFormat('Hola')).toEqual({ bold: false, italic: false, under: false, strike: false });
    expect(describeFormat(toggleFormat('Hola', 'bold'))).toMatchObject({ bold: true, italic: false });
    const mix = toggleFormat(toggleFormat('Hola', 'bold'), 'strike');
    expect(describeFormat(mix)).toMatchObject({ bold: true, strike: true, under: false });
  });
  it('un texto sin letras no tiene negrita ni cursiva (pero un signo sí se puede tachar)', () => {
    expect(describeFormat('123 !')).toMatchObject({ bold: false, italic: false });
    expect(describeFormat('')).toEqual({ bold: false, italic: false, under: false, strike: false });
  });
  it('clearFormat lo deja todo normal, también lo combinado', () => {
    let t = 'Hola ñandú';
    for (const f of ['bold', 'italic', 'under', 'strike']) t = toggleFormat(t, f);
    expect(hasFormat(t)).toBe(true);
    expect(clearFormat(t)).toBe('Hola ñandú');
    expect(hasFormat(clearFormat(t))).toBe(false);
  });
  it('un formato desconocido es un error', () => {
    expect(() => toggleFormat('a', 'neon')).toThrow('Formato desconocido');
  });
});

describe('listas', () => {
  it('viñetas: las añade a las líneas con texto y no a las vacías', () => {
    const r = toggleList('uno\n\ndos', 0, 8, 'bullets');
    expect(r.replacement).toBe('• uno\n\n• dos');
  });
  it('numeradas: numera seguido y cambia las viñetas por números', () => {
    expect(toggleList('• a\n• b', 0, 7, 'numbers').replacement).toBe('1. a\n2. b');
  });
  it('si ya eran lista, la quita', () => {
    expect(toggleList('• a\n• b', 0, 7, 'bullets').replacement).toBe('a\nb');
    expect(toggleList('1. a\n2. b', 0, 9, 'numbers').replacement).toBe('a\nb');
  });
  it('actúa solo sobre las líneas tocadas por la selección', () => {
    const text = 'a\nb\nc';
    const r = toggleList(text, 2, 3, 'bullets');
    expect([r.from, r.to, r.replacement]).toEqual([2, 3, '• b']);
  });
});

describe('formatRange (selección de un cuadro de texto)', () => {
  it('formatea la selección y devuelve la selección nueva', () => {
    const r = formatRange('Hola mundo', 0, 4, 'bold');
    expect(r).toMatchObject({ from: 0, to: 4, replacement: '𝗛𝗼𝗹𝗮' });
    expect(r.selEnd - r.selStart).toBe('𝗛𝗼𝗹𝗮'.length);
  });
  it('sin selección actúa sobre la palabra bajo el cursor', () => {
    expect(wordAt('Hola mundo', 7)).toEqual([5, 10]);
    expect(formatRange('Hola mundo', 7, 7, 'italic')).toMatchObject({ from: 5, to: 10, replacement: '𝘮𝘶𝘯𝘥𝘰' });
  });
  it('sin selección y sin palabra no hace nada', () => {
    expect(formatRange('Hola  mundo', 5, 5, 'bold')).toBeNull();
    expect(formatRange('', 0, 0, 'bold')).toBeNull();
  });
  it('quitar formato y listas pasan por la misma función', () => {
    const bold = toggleFormat('Hola', 'bold');
    expect(formatRange(bold, 0, bold.length, 'clear').replacement).toBe('Hola');
    expect(formatRange('x', 0, 1, 'bullets').replacement).toBe('• x');
    expect(formatRange('x', 0, 1, 'clear')).toBeNull();
  });
  it('el subrayado se pide como «underline»', () => {
    expect(formatRange('ab', 0, 2, 'underline').replacement).toBe('a̲b̲');
  });
});

describe('graphemes', () => {
  it('una letra con acento o con subrayado cuenta como un carácter', () => {
    expect(splitGraphemes('éa')).toHaveLength(2);
    expect(splitGraphemes(toggleFormat('ab', 'under'))).toHaveLength(2);
    expect(splitGraphemes('')).toEqual([]);
  });
});
