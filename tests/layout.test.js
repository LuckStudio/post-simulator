import { beforeAll, describe, expect, it } from 'vitest';
import { buildPostPages, postGeometry, stackPost } from '../src/render/layout.js';
import { installFakeMeasure, rcFor } from './helpers.js';

beforeAll(installFakeMeasure);
const pagesFor = (patch) => {
  const rc = rcFor(patch);
  return buildPostPages(rc, postGeometry(rc));
};
const LONG = Array.from({ length: 12 }, (_, i) => `Párrafo ${i}: ` + 'palabra '.repeat(30)).join('\n\n');

describe('postGeometry', () => {
  it('reserva el pie solo si hay paginador o usuario', () => {
    const a = postGeometry(rcFor());
    const b = postGeometry(rcFor({ style: { pager: false, footerHandle: false } }));
    expect(b.maxH - a.maxH).toBeCloseTo(56);
  });
  it('escala con el lado corto del formato', () => {
    expect(postGeometry(rcFor({ format: '16:9' })).S).toBe(1);
    expect(postGeometry(rcFor({ format: '9:16' })).H).toBe(1920);
  });
});

describe('buildPostPages', () => {
  it('modo dividir: reparte un texto largo en varias slides que caben', () => {
    const rc = rcFor({ post: { text: LONG } });
    const G = postGeometry(rc);
    const pages = buildPostPages(rc, G);
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) {
      const lh = p.size * 1.42 * G.S;
      expect(
        stackPost(G, { header: p.header, nLines: p.lines.length, lh, mediaH: p.mediaH, footer: p.footer }).h,
      ).toBeLessThanOrEqual(G.maxH);
    }
  });
  it('modo dividir: solo la última lleva reacciones salvo que se pidan en todas', () => {
    expect(
      pagesFor({ post: { text: LONG } })
        .map((p) => p.footer)
        .slice(0, -1),
    ).not.toContain(true);
    expect(pagesFor({ post: { text: LONG, footerEvery: true } }).every((p) => p.footer)).toBe(true);
  });
  it('modo dividir: la cabecera se repite o no según la opción', () => {
    expect(
      pagesFor({ post: { text: LONG, repeatHeader: false } })
        .map((p) => p.header)
        .slice(1),
    ).not.toContain(true);
  });
  it('no pierde texto al dividir', () => {
    const count = (s) => s.split(/\s+/).filter(Boolean).length;
    const pages = pagesFor({ post: { text: LONG } });
    const total = pages.reduce((a, p) => a + p.lines.reduce((b, l) => b + l.words.length, 0), 0);
    expect(total).toBe(count(LONG));
  });
  it('modo automático: una sola slide, con el mayor tamaño que cabe', () => {
    const short = pagesFor({ post: { fit: 'auto', text: 'Hola' } });
    expect(short).toHaveLength(1);
    expect(short[0].size).toBe(46);
    const long = pagesFor({ post: { fit: 'auto', text: LONG } });
    expect(long).toHaveLength(1);
    expect(long[0].size).toBe(24);
    expect(long[0].more).toBe(true);
  });
  it('modo fijo: corta con "… más" en el número de líneas pedido', () => {
    const [p] = pagesFor({ post: { fit: 'manual', more: true, moreLines: 4, text: LONG } });
    expect(p.lines).toHaveLength(4);
    expect(p.more).toBe(true);
  });
});
