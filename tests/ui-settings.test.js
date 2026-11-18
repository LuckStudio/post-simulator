import { describe, expect, it } from 'vitest';
import { DEFAULT_UI, UI_SETTINGS, normalizeUi, uiAttributes } from '../src/core/uiSettings.js';
import { createPrefs } from '../src/state/prefs.js';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

describe('ajustes de la interfaz', () => {
  it('por defecto: apariencia automática y densidad cómoda', () => {
    expect(DEFAULT_UI).toEqual({ appearance: 'system', mobilePreview: 'top', density: 'comfortable' });
  });
  it('cada ajuste tiene su opción por defecto entre sus opciones y un atributo', () => {
    for (const s of Object.values(UI_SETTINGS)) {
      expect(Object.keys(s.options)).toContain(s.default);
      expect(s.attr).toMatch(/^[a-z]+$/);
    }
  });
  it('normaliza: descarta claves y valores desconocidos', () => {
    expect(normalizeUi({ appearance: 'dark', density: 'enorme', hack: 1 })).toEqual({
      appearance: 'dark',
      mobilePreview: 'top',
      density: 'comfortable',
    });
    expect(normalizeUi(null)).toEqual(DEFAULT_UI);
    expect(normalizeUi({ appearance: 'toString' })).toEqual(DEFAULT_UI);
  });
  it('los valores por defecto no ponen atributo; el resto sí', () => {
    expect(uiAttributes(DEFAULT_UI)).toEqual({ theme: null, preview: null, density: null });
    expect(uiAttributes({ appearance: 'light', mobilePreview: 'floating', density: 'compact' })).toEqual({
      theme: 'light',
      preview: 'floating',
      density: 'compact',
    });
  });
});

describe('prefs.ui', () => {
  it('guarda, combina y restablece sin tocar las tipografías', () => {
    const st = mem();
    const p = createPrefs(st);
    p.addRecentFont('Georgia');
    expect(p.setUi({ appearance: 'dark' })).toEqual({
      appearance: 'dark',
      mobilePreview: 'top',
      density: 'comfortable',
    });
    p.setUi({ density: 'compact' });
    expect(createPrefs(st).get().ui).toEqual({ appearance: 'dark', mobilePreview: 'top', density: 'compact' });
    expect(p.resetUi()).toEqual(DEFAULT_UI);
    expect(createPrefs(st).get().fontsRecent).toEqual(['Georgia']);
  });
  it('un valor no válido no se guarda', () => {
    const p = createPrefs(mem());
    expect(p.setUi({ appearance: 'arcoiris' }).appearance).toBe('system');
  });
});
