import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../src/state/defaults.js';
import { TEMPLATES, getTemplate, stateFromTemplate } from '../src/state/templates.js';
import { UI_ICON } from '../src/ui/icons.js';

describe('plantillas', () => {
  it('ids únicos y datos de lista completos', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      expect(t.name && t.title && t.desc).toBeTruthy();
      expect(UI_ICON[t.icon], `icono de ${t.id}`).toBeTruthy();
    }
  });

  it('la libre es el estado inicial tal cual', () => {
    expect(stateFromTemplate('libre', createDefaultState())).toEqual(createDefaultState());
  });

  it('cada plantilla genera un estado completo y distinto del vacío', () => {
    const base = createDefaultState();
    for (const t of TEMPLATES.filter((x) => x.id !== 'libre')) {
      const s = stateFromTemplate(t.id, base);
      expect(Object.keys(s).sort()).toEqual(Object.keys(base).sort());
      expect(s.post.text).not.toBe(base.post.text);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s); // serializable
    }
  });

  it('empleo y evento llevan portada y cierre para contactar', () => {
    for (const id of ['empleo', 'evento']) {
      const s = stateFromTemplate(id, createDefaultState());
      expect(s.cover.on).toBe(true);
      expect(s.cta).toMatchObject({ on: true, mode: 'offer' });
    }
  });

  it('la guía reparte el texto en varias slides y no deja medios', () => {
    const s = stateFromTemplate('guia', createDefaultState());
    expect(s.post.fit).toBe('split');
    expect(s.media.type).toBe('none');
    expect(s.cover.location).toBe('');
  });

  it('respeta el estilo del estado inicial: solo cambia el contenido', () => {
    const base = createDefaultState();
    base.style.accent = '#AA3300';
    base.style.font = 'Georgia';
    base.anim.preset = 'otro';
    const s = stateFromTemplate('novedad', base);
    expect(s.style.accent).toBe('#AA3300');
    expect(s.style.font).toBe('Georgia');
    expect(s.anim.preset).toBe('otro');
    expect(s.cta.mode).toBe('seek');
  });

  it('no modifica el estado base ni la plantilla', () => {
    const base = createDefaultState();
    const before = JSON.stringify(base);
    const patchBefore = JSON.stringify(getTemplate('empleo').patch);
    stateFromTemplate('empleo', base).cover.role = 'x';
    expect(JSON.stringify(base)).toBe(before);
    expect(JSON.stringify(getTemplate('empleo').patch)).toBe(patchBefore);
  });

  it('una plantilla desconocida da un error claro', () => {
    expect(() => stateFromTemplate('nada', createDefaultState())).toThrow('Plantilla desconocida');
  });
});
