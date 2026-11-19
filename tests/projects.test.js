import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../src/state/defaults.js';
import { bootProjects } from '../src/state/boot.js';
import { autosaveProject } from '../src/state/persistence.js';
import { createPrefs } from '../src/state/prefs.js';
import {
  createProjects,
  defaultProjectName,
  cleanName,
  cleanGuide,
  DEFAULT_PROJECT_NAME,
} from '../src/state/projects.js';
import { createMemoryBackend } from '../src/state/projectsDb.js';
import { createStore } from '../src/state/store.js';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

/** Reloj y ids controlados para que el orden sea predecible. */
function setup() {
  let t = 1000;
  let n = 0;
  const backend = createMemoryBackend();
  const projects = createProjects(backend, { now: () => (t += 10), uid: () => `id${++n}` });
  return { backend, projects };
}
const stateWith = (patch = {}) => ({ ...createDefaultState(), ...patch });

describe('nombres', () => {
  it('limpia espacios, recorta el largo y deja vacío lo vacío', () => {
    expect(cleanName('  Mi   post \n nuevo ')).toBe('Mi post nuevo');
    expect(cleanName('x'.repeat(200))).toHaveLength(80);
    expect(cleanName(null)).toBe('');
  });
  it('el nombre inicial sale de la portada, del autor o es genérico', () => {
    const s = createDefaultState();
    s.cover.on = true;
    s.cover.role = 'Guía rápida';
    expect(defaultProjectName(s)).toBe('Guía rápida');
    s.cover.on = false;
    expect(defaultProjectName(s)).toBe(s.author.name);
    s.author.name = '';
    expect(defaultProjectName(s)).toBe(DEFAULT_PROJECT_NAME);
  });
});

describe('biblioteca de proyectos', () => {
  it('crea, lista (el más reciente primero) y carga con su estado', async () => {
    const { projects } = setup();
    const a = await projects.create({ name: 'Uno', state: stateWith() });
    const b = await projects.create({ name: 'Dos', state: stateWith({ format: '1:1' }) });
    expect((await projects.list()).map((m) => m.name)).toEqual(['Dos', 'Uno']);
    expect(b.format).toBe('1:1');
    const loaded = await projects.load(a.id);
    expect(loaded.meta.name).toBe('Uno');
    expect(loaded.state.format).toBe(createDefaultState().format);
    expect(loaded.video).toBeNull();
    expect(await projects.load('no-existe')).toBeNull();
  });

  it('el nombre vacío se sustituye por uno derivado del contenido', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: '   ', state: stateWith() });
    expect(m.name).toBe(defaultProjectName(createDefaultState()));
  });

  it('guardar actualiza estado y fecha, y no recrea un proyecto eliminado', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: 'A', state: stateWith() });
    const s = stateWith({ format: '9:16' });
    const saved = await projects.save(m.id, s, { slides: 3, thumb: 'data:x' });
    expect(saved.updatedAt).toBeGreaterThan(m.updatedAt);
    expect(saved).toMatchObject({ format: '9:16', slides: 3, thumb: 'data:x', name: 'A' });
    expect((await projects.load(m.id)).state.format).toBe('9:16');
    // Una copia: cambiar el estado después no altera lo guardado.
    s.format = '1:1';
    expect((await projects.load(m.id)).state.format).toBe('9:16');
    await projects.remove(m.id);
    expect(await projects.save(m.id, s)).toBeNull();
    expect(await projects.count()).toBe(0);
  });

  it('guardar sin miniatura conserva la anterior', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: 'A', state: stateWith(), thumb: 'data:a' });
    const saved = await projects.save(m.id, stateWith(), { slides: 2 });
    expect(saved.thumb).toBe('data:a');
  });

  it('renombra: espacios fuera y un nombre vacío no cambia nada', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: 'A', state: stateWith() });
    expect((await projects.rename(m.id, '  Nuevo  nombre ')).name).toBe('Nuevo nombre');
    expect((await projects.rename(m.id, '   ')).name).toBe('Nuevo nombre');
    expect(await projects.rename('x', 'y')).toBeNull();
  });

  it('duplica con estado y vídeo propios, sin tocar el original', async () => {
    const { projects } = setup();
    const blob = new Blob(['video']);
    const m = await projects.create({ name: 'Original', state: stateWith(), video: { blob, name: 'v.mp4' } });
    const copy = await projects.duplicate(m.id);
    expect(copy.id).not.toBe(m.id);
    expect(copy.name).toBe('Original (copia)');
    expect(copy.hasVideo).toBe(true);
    expect((await projects.load(copy.id)).video).toEqual({ blob, name: 'v.mp4' });
    await projects.remove(m.id);
    expect((await projects.load(copy.id)).video.name).toBe('v.mp4'); // la copia sigue entera
    expect(await projects.duplicate('x')).toBeNull();
  });

  it('el vídeo se guarda, se sustituye y se quita; eliminar el proyecto lo borra', async () => {
    const { projects, backend } = setup();
    const m = await projects.create({ name: 'A', state: stateWith() });
    expect(m.hasVideo).toBe(false);
    expect((await projects.setVideo(m.id, new Blob(['1']), 'a.mp4')).hasVideo).toBe(true);
    await projects.setVideo(m.id, new Blob(['2']), 'b.mp4');
    expect((await projects.load(m.id)).video.name).toBe('b.mp4');
    expect((await projects.clearVideo(m.id)).hasVideo).toBe(false);
    expect((await projects.load(m.id)).video).toBeNull();
    await projects.setVideo(m.id, new Blob(['3']), 'c.mp4');
    expect(await projects.remove(m.id)).toBe(true);
    expect(await backend.all('blobs')).toEqual([]);
    expect(await backend.all('data')).toEqual([]);
    expect(await projects.remove(m.id)).toBe(false);
    expect(await projects.setVideo(m.id, new Blob(['x']))).toBeNull();
  });

  it('un lote es atómico: si una operación falla no se aplica ninguna', async () => {
    const backend = createMemoryBackend();
    await expect(
      backend.batch([
        { op: 'put', store: 'meta', value: { id: 'a' } },
        { op: 'put', store: 'otra', value: { id: 'b' } },
      ]),
    ).rejects.toThrow();
    expect(await backend.all('meta')).toEqual([]);
  });
});

describe('modo guiado en la ficha del proyecto', () => {
  it('cleanGuide deja plantilla y paso válidos o nada', () => {
    expect(cleanGuide({ template: 'empleo', step: 2 })).toEqual({ template: 'empleo', step: 2 });
    expect(cleanGuide({ template: 'empleo', step: -1 })).toEqual({ template: 'empleo', step: 0 });
    expect(cleanGuide({ template: 'empleo', step: 'x', extra: 1 })).toEqual({ template: 'empleo', step: 0 });
    expect(cleanGuide({ step: 1 })).toBeNull();
    expect(cleanGuide(null)).toBeNull();
  });

  it('se puede crear con guía, avanzar, conservarla al autoguardar y quitarla', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: 'G', state: stateWith(), guide: { template: 'guia', step: 0 } });
    expect(m.guide).toEqual({ template: 'guia', step: 0 });
    expect((await projects.setGuide(m.id, { template: 'guia', step: 3 })).guide.step).toBe(3);
    const saved = await projects.save(m.id, stateWith(), { slides: 2 });
    expect(saved.guide).toEqual({ template: 'guia', step: 3 });
    const cleared = await projects.setGuide(m.id, null);
    expect('guide' in cleared).toBe(false);
    expect('guide' in (await projects.getMeta(m.id))).toBe(false);
    expect(await projects.setGuide('x', { template: 'a', step: 0 })).toBeNull();
  });

  it('cambiar el paso no cuenta como edición (no mueve la fecha)', async () => {
    const { projects } = setup();
    const m = await projects.create({ name: 'G', state: stateWith(), guide: { template: 'guia', step: 0 } });
    const after = await projects.setGuide(m.id, { template: 'guia', step: 1 });
    expect(after.updatedAt).toBe(m.updatedAt);
  });

  it('un proyecto sin guía no la tiene, y duplicar conserva la del original', async () => {
    const { projects } = setup();
    const plain = await projects.create({ name: 'P', state: stateWith() });
    expect('guide' in plain).toBe(false);
    const g = await projects.create({ name: 'G', state: stateWith(), guide: { template: 'evento', step: 2 } });
    expect((await projects.duplicate(g.id)).guide).toEqual({ template: 'evento', step: 2 });
  });
});

describe('arranque de la biblioteca', () => {
  const run = (over = {}) => {
    const { backend } = setup();
    const prefs = createPrefs(mem());
    return {
      backend,
      prefs,
      boot: () =>
        bootProjects({
          backend,
          prefs,
          loadLegacy: () => null,
          makeInitial: () => stateWith({ format: '1:1' }),
          ...over,
        }),
    };
  };

  it('la primera vez crea un proyecto con el estado inicial y lo recuerda', async () => {
    const { boot, prefs } = run();
    const r = await boot();
    expect(r.current.state.format).toBe('1:1');
    expect(prefs.get().lastProject).toBe(r.current.meta.id);
    expect(await r.projects.count()).toBe(1);
  });

  it('pasa a la biblioteca el proyecto antiguo de localStorage una sola vez', async () => {
    const legacy = stateWith({ format: '3:4' });
    const { boot, prefs } = run({ loadLegacy: () => legacy });
    const first = await boot();
    expect(first.current.state.format).toBe('3:4');
    expect(prefs.get().legacyMigrated).toBe(true);
    // Si se borra todo, no vuelve a importarse el antiguo.
    await first.projects.remove(first.current.meta.id);
    const second = await boot();
    expect(second.current.state.format).toBe('1:1');
  });

  it('abre el último usado y, si ya no existe, el más reciente', async () => {
    const { boot, prefs, backend } = run();
    const { projects } = await boot();
    const a = (await projects.list())[0];
    const b = await projects.create({ name: 'B', state: stateWith({ format: '9:16' }) });
    prefs.setLastProject(a.id);
    expect((await boot()).current.meta.id).toBe(a.id);
    prefs.setLastProject('borrado');
    expect((await boot()).current.meta.id).toBe(b.id);
    expect((await backend.all('meta')).length).toBe(2);
  });

  it('si el almacén falla, el error llega a quien llama (para volver a localStorage)', async () => {
    const bad = { all: () => Promise.reject(new Error('sin IndexedDB')) };
    await expect(
      bootProjects({ backend: bad, prefs: createPrefs(mem()), loadLegacy: () => null, makeInitial: stateWith }),
    ).rejects.toThrow('sin IndexedDB');
  });
});

describe('autoguardado en la biblioteca', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function open() {
    const { projects } = setup();
    const meta = await projects.create({ name: 'A', state: stateWith() });
    const store = createStore(stateWith());
    let id = meta.id;
    const onError = vi.fn();
    const saver = autosaveProject(store, projects, { getId: () => id, delay: 100, onError });
    return { projects, store, saver, onError, meta, setId: (v) => (id = v) };
  }

  it('guarda tras una pausa y agrupa varios cambios seguidos', async () => {
    const { projects, store, meta } = await open();
    const spy = vi.spyOn(projects, 'save');
    store.set('author.name', 'Uno');
    store.set('author.name', 'Dos');
    await vi.advanceTimersByTimeAsync(99);
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((await projects.load(meta.id)).state.author.name).toBe('Dos');
  });

  it('flush guarda lo pendiente de inmediato', async () => {
    const { projects, store, saver, meta } = await open();
    store.set('author.name', 'Ya');
    await saver.flush();
    expect((await projects.load(meta.id)).state.author.name).toBe('Ya');
  });

  it('withoutSaving no cuenta los cambios como ediciones', async () => {
    const { projects, store, saver } = await open();
    const spy = vi.spyOn(projects, 'save');
    saver.withoutSaving(() => store.replace(stateWith({ format: '1:1' })));
    await vi.advanceTimersByTimeAsync(500);
    expect(spy).not.toHaveBeenCalled();
  });

  it('guarda en el proyecto que estaba abierto al editar, aunque luego se cambie', async () => {
    const { projects, store, saver, meta, setId } = await open();
    const other = await projects.create({ name: 'B', state: stateWith() });
    store.set('author.name', 'De A');
    await saver.flush();
    setId(other.id);
    expect((await projects.load(meta.id)).state.author.name).toBe('De A');
    expect((await projects.load(other.id)).state.author.name).not.toBe('De A');
  });

  it('avisa una sola vez si no se puede guardar', async () => {
    const { projects, store, onError } = await open();
    vi.spyOn(projects, 'save').mockRejectedValue(new Error('cuota'));
    store.set('author.name', 'x');
    await vi.advanceTimersByTimeAsync(150);
    store.set('author.name', 'y');
    await vi.advanceTimersByTimeAsync(150);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
