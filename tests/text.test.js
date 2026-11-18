import { beforeAll, describe, expect, it } from 'vitest';
import { charCount, trimBlank, truncateMore, wrapText } from '../src/render/text.js';
import { installFakeMeasure, rcFor } from './helpers.js';

beforeAll(installFakeMeasure);
const words = (lines) => lines.map((l) => l.words.map((w) => w.t).join(' '));

describe('wrapText', () => {
  // Con tamaño 10, cada carácter mide 5 px.
  it('parte en líneas que caben en el ancho', () => {
    const lines = wrapText(rcFor(), 'uno dos tres cuatro', 50, 10);
    expect(words(lines)).toEqual(['uno dos', 'tres', 'cuatro']);
    lines.forEach((l) => expect(l.w).toBeLessThanOrEqual(50));
  });
  it('respeta los saltos de línea y crea líneas vacías para los párrafos', () => {
    expect(words(wrapText(rcFor(), 'a\n\nb', 100, 10))).toEqual(['a', '', 'b']);
  });
  it('corta palabras más largas que la línea', () => {
    expect(words(wrapText(rcFor(), 'abcdefghij', 25, 10))).toEqual(['abcde', 'fghij']);
  });
  it('marca hashtags, menciones y enlaces solo si se pide y está activado', () => {
    const acc = (rc, accent) =>
      wrapText(rc, '#empleo @ana www.x.com hola', 1000, 10, 400, accent)[0].words.map((w) => w.acc);
    expect(acc(rcFor(), true)).toEqual([true, true, true, false]);
    expect(acc(rcFor(), false)).toEqual([false, false, false, false]);
    expect(acc(rcFor({ post: { hashtags: false } }), true)).toEqual([false, false, false, false]);
  });
  it('cuenta caracteres compuestos (emoji) como uno', () => {
    expect(wrapText(rcFor(), '🚀', 100, 10)[0].words[0].n).toBe(1);
  });
});

describe('utilidades de líneas', () => {
  it('trimBlank quita las líneas vacías de los extremos', () => {
    expect(words(trimBlank(wrapText(rcFor(), '\n\nhola\n\n', 100, 10)))).toEqual(['hola']);
  });
  it('charCount incluye espacios entre palabras y saltos entre líneas', () => {
    expect(charCount(wrapText(rcFor(), 'ab cd\nef', 100, 10))).toBe(8);
  });
  it('truncateMore deja sitio para "… más" en la última línea', () => {
    const rc = rcFor();
    const lines = truncateMore(rc, wrapText(rc, 'uno dos tres', 60, 10), 60, 10);
    // "… más" + espacio = 7 caracteres = 35 px → quedan 25 px: solo cabe "uno".
    expect(words(lines)).toEqual(['uno']);
  });
});
