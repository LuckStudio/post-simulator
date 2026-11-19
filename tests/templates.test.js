import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../src/state/defaults.js';
import { getPath } from '../src/core/utils.js';
import { TEMPLATES, getTemplate, stateFromTemplate, stepCount } from '../src/state/templates.js';
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

describe('pasos del modo guiado', () => {
  it('cada plantilla tiene pasos, ids únicos y termina en la pantalla final', () => {
    for (const t of TEMPLATES) {
      expect(t.steps.length, t.id).toBeGreaterThan(2);
      expect(new Set(t.steps.map((s) => s.id)).size, t.id).toBe(t.steps.length);
      expect(t.steps.at(-1).finish, t.id).toBe(true);
      expect(stepCount(t.id)).toBe(t.steps.length);
    }
    expect(stepCount('nada')).toBe(0);
  });

  it('cada paso es de un solo tipo y sus campos existen en el proyecto', () => {
    for (const t of TEMPLATES) {
      const state = stateFromTemplate(t.id, createDefaultState());
      for (const step of t.steps) {
        const kinds = [!!step.fields, !!step.panel, !!step.finish].filter(Boolean).length;
        expect(kinds, `${t.id}/${step.id}`).toBe(1);
        expect(step.title && step.hint).toBeTruthy();
        if (step.panel) expect(['media', 'style']).toContain(step.panel);
        for (const f of step.fields ?? []) {
          expect(getPath(state, f.path), `${t.id}/${step.id}: ${f.path}`).not.toBeUndefined();
          expect(f.label).toBeTruthy();
        }
      }
    }
  });

  it('los pasos que enseñan portada o cierre solo están si la plantilla los incluye', () => {
    for (const t of TEMPLATES) {
      const state = stateFromTemplate(t.id, createDefaultState());
      for (const step of t.steps) {
        if (step.show === 'cover') expect(state.cover.on, `${t.id}/${step.id}`).toBe(true);
        if (step.show === 'cta') expect(state.cta.on, `${t.id}/${step.id}`).toBe(true);
      }
    }
  });
});
