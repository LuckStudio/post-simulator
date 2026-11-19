import { describe, expect, it } from 'vitest';
import { shortDate, timeAgo } from '../src/core/time.js';
import { uniqueName } from '../src/state/projects.js';

const now = new Date(2026, 10, 19, 12, 0, 0).getTime();
const ago = (ms) => now - ms;
const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;

describe('timeAgo', () => {
  it('escala de momento a días', () => {
    expect(timeAgo(ago(20_000), now)).toBe('hace un momento');
    expect(timeAgo(ago(5 * MIN), now)).toBe('hace 5 min');
    expect(timeAgo(ago(2 * H + 10 * MIN), now)).toBe('hace 2 h');
    expect(timeAgo(ago(30 * H), now)).toBe('ayer');
    expect(timeAgo(ago(3 * D), now)).toBe('hace 3 días');
  });
  it('pasada una semana, fecha corta (con año solo si es de otro año)', () => {
    expect(timeAgo(ago(10 * D), now)).toBe('9 nov');
    expect(shortDate(new Date(2025, 11, 3).getTime(), now)).toBe('3 dic 2025');
  });
  it('una fecha futura (reloj desajustado) no da valores raros', () => {
    expect(timeAgo(now + 5 * H, now)).toBe('hace un momento');
  });
});

describe('uniqueName', () => {
  it('numera los nombres repetidos sin distinguir mayúsculas', () => {
    expect(uniqueName('Sin título', [])).toBe('Sin título');
    expect(uniqueName('Sin título', ['sin título'])).toBe('Sin título 2');
    expect(uniqueName('Sin título', ['Sin título', 'Sin título 2'])).toBe('Sin título 3');
  });
  it('las copias se numeran como «(copia)», «(copia 2)»…', () => {
    expect(uniqueName('Guía', ['Guía'], { copy: true })).toBe('Guía (copia)');
    expect(uniqueName('Guía', ['Guía (copia)'], { copy: true })).toBe('Guía (copia 2)');
  });
});
