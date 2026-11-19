import { FORMATS } from './core/constants.js';
import { UserError } from './core/errors.js';
import { clone, slug } from './core/utils.js';
import { PRESETS } from './animation/presets.js';
import { createStore, hydrate } from './state/store.js';
import { createDefaultState } from './state/defaults.js';
import { autosave, autosaveProject, loadSaved } from './state/persistence.js';
import { defaultProjectName } from './state/projects.js';
import { getTemplate } from './state/templates.js';
import { createPrefs } from './state/prefs.js';
import {
  addPreset,
  applyPreset,
  createPreset,
  getDefaultPreset,
  importPresets,
  isPresetFile,
  loadLibrary,
  readPresetFile,
  removePreset,
  renamePreset,
  saveLibrary,
  serializePresets,
  setDefaultPreset,
  updatePreset,
} from './state/presets.js';
import { createAssets } from './render/assets.js';
import { fontFn } from './render/context.js';
import { copySlideImage, exportAllPngZip, exportSlidePng } from './export/images.js';
import { shareSlides } from './export/share.js';
import { renderSlideToCanvas } from './render/carousel.js';
import { exportProjectJson, exportViewerHtml } from './export/project.js';
import { exportVideo } from './export/video.js';
import { canvasToBlob, projectBaseName, saveFile, slideFileName } from './io/files.js';
import { detectInstalledFonts } from './io/fonts.js';
import { parseProjectFile, serializeProject } from './io/project.js';
import { createInstallPrompt, requestPersistence, storageStatus } from './pwa.js';
import { applyUiSettings } from './ui/appearance.js';
import { createContextMenu } from './ui/contextMenu.js';
import { $, h } from './ui/dom.js';
import { createRecorderDialog, toast } from './ui/feedback.js';
import { createFields } from './ui/fields.js';
import { mountStaticIcons } from './ui/icons.js';
import { createExportSheet } from './ui/exportSheet.js';
import { createHome } from './ui/home.js';
import { createMobileShell } from './ui/mobile.js';
import { createPanelHost } from './ui/panels/index.js';
import { createPreview } from './ui/preview.js';
import { buildSlideMenu } from './ui/slideMenu.js';

/**
 * Algunos vídeos (WebM grabados por el navegador, grabaciones de pantalla) no declaran su
 * duración y el navegador devuelve Infinity. Saltar al final fuerza a calcularla.
 */
function resolveVideoDuration(v) {
  if (Number.isFinite(v.duration)) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      v.removeEventListener('timeupdate', finish);
      clearTimeout(timer);
      try {
        v.currentTime = 0;
      } catch {
        /* sin búsqueda posible */
      }
      resolve();
    };
    const timer = setTimeout(finish, 3000);
    v.addEventListener('timeupdate', finish);
    try {
      v.currentTime = 1e101;
    } catch {
      finish();
    }
  });
}

/** Un avance del modo guiado solo vale si su plantilla existe; el paso se ajusta a su número de pasos. */
function validGuide(g) {
  const t = g && getTemplate(g.template);
  if (!t) return null;
  return { template: g.template, step: Math.min(Math.max(0, g.step | 0), t.steps.length - 1) };
}

/** Estado de un proyecto nuevo: el preset marcado como inicial, si hay uno, o los valores estándar. */
export function initialState() {
  const start = getDefaultPreset(loadLibrary());
  return start ? applyPreset(createDefaultState(), start) : createDefaultState();
}

/**
 * Punto de composición: crea el store, los recursos, la vista previa y el panel,
 * y define las acciones de alto nivel (exportar, importar, vídeo, presets…).
 */
export function startApp({ boot = null } = {}) {
  const prefs = createPrefs();
  let library = loadLibrary();

  // Biblioteca de proyectos (IndexedDB). Sin ella (`boot` nulo) se usa el guardado clásico en localStorage.
  const projects = boot?.projects ?? null;
  let currentId = boot?.current.meta.id ?? null;
  /** Modo guiado en curso del proyecto abierto: { template, step } o null. */
  let guideState = validGuide(boot?.current.meta.guide);

  // Proyecto de partida: el abierto en la biblioteca o, si no hay, el guardado clásico o el estado inicial.
  const store = createStore(boot ? hydrate(boot.current.state) : (loadSaved() ?? initialState()));
  const assets = createAssets(() => preview.invalidate());
  const recorder = createRecorderDialog();
  const menu = createContextMenu();
  const install = createInstallPrompt(() => {
    if (panels.active === 'presets') panels.render();
  });

  const quotaMessage = 'El proyecto pesa demasiado para guardarse solo. Usa Exportar > Proyecto JSON.';
  let lastThumbAt = 0;
  /** Miniatura de la primera slide (dataURL pequeño) para la lista de proyectos. */
  function makeThumb() {
    const { rc, slides } = preview.carousel;
    const full = renderSlideToCanvas(rc, slides[0]);
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = Math.round((360 * rc.H) / rc.W);
    c.getContext('2d').drawImage(full, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  }
  /** Datos de la ficha del proyecto al guardar; la miniatura se renueva como mucho cada pocos segundos. */
  function describeProject(force = false) {
    try {
      preview.flush();
      const out = { slides: preview.carousel.slides.length };
      const t = performance.now();
      if (force || !lastThumbAt || t - lastThumbAt > 4000) {
        out.thumb = makeThumb();
        lastThumbAt = t;
      }
      return out;
    } catch {
      return {};
    }
  }
  const projectSaver = projects
    ? autosaveProject(store, projects, {
        getId: () => currentId,
        describe: describeProject,
        onError: () => toast(quotaMessage, true),
      })
    : (autosave(store, { onQuotaExceeded: () => toast(quotaMessage, true) }), null);
  // Al ocultar o cerrar la pestaña se guarda lo pendiente.
  const flushNow = () => projectSaver?.flush();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushNow());
  window.addEventListener('pagehide', flushNow);

  const preview = createPreview({
    store,
    assets,
    onSlideMenu: (target, x, y, opener) => openSlideMenu(target, { x, y, opener }),
    onGhost: (which) => {
      store.set(which === 'cover' ? 'cover.on' : 'cta.on', true);
      panels.render();
    },
  });

  function openSlideMenu(target, { x, y, opener = null, anchor }) {
    const { title, items } = buildSlideMenu({ target, store, panels, preview, actions, toast });
    menu.open({ x, y, title, items, opener, anchor });
  }

  // ---------- Acciones ----------

  /** Ejecuta una exportación con la vista previa parada y el vídeo en su fotograma estático. */
  const withStaticPreview = async (fn) => {
    preview.syncVideoStatic();
    await fn(preview.carousel);
  };

  // --- presets ---

  /** Guarda la biblioteca; si no cabe en el almacenamiento, avisa y no cambia nada. */
  function commitLibrary(next) {
    try {
      saveLibrary(next);
    } catch {
      toast('No caben más presets en el almacenamiento del navegador. Exporta o elimina alguno.', true);
      return false;
    }
    library = next;
    panels.render();
    return true;
  }
  const findPreset = (id) => library.items.find((p) => p.id === id);
  const guarded = (fn) => {
    try {
      return fn();
    } catch (e) {
      toast(e instanceof UserError ? e.message : 'No se pudo completar la operación.', true);
      return null;
    }
  };

  const presets = {
    library: () => library,

    save({ name, sections }) {
      return guarded(() => {
        const preset = createPreset({ name, state: store.state, sections });
        const next = addPreset(library, preset);
        if (!commitLibrary(next)) return null;
        const saved = next.items[next.items.length - 1];
        // Pedir almacenamiento persistente al guardar el primer preset: es cuando importa.
        requestPersistence();
        toast(`Preset «${saved.name}» guardado.`);
        return saved;
      });
    },

    apply(id) {
      const p = findPreset(id);
      if (!p) return;
      store.replace(applyPreset(store.state, p));
      actions.ensureFontLoaded();
      toast(`Preset «${p.name}» aplicado.`);
    },

    remove(id) {
      const p = findPreset(id);
      if (p && confirm(`¿Eliminar el preset «${p.name}»? No se puede deshacer.`)) {
        commitLibrary(removePreset(library, id));
      }
    },

    rename(id) {
      const p = findPreset(id);
      if (!p) return;
      const name = prompt('Nuevo nombre del preset', p.name);
      if (name == null) return;
      guarded(() => commitLibrary(renamePreset(library, id, name)));
    },

    update(id) {
      const p = findPreset(id);
      if (p && confirm(`¿Sustituir los ajustes de «${p.name}» por los actuales?`)) {
        if (commitLibrary(updatePreset(library, id, store.state))) toast(`Preset «${p.name}» actualizado.`);
      }
    },

    setDefault(id) {
      commitLibrary(setDefaultPreset(library, id));
    },

    exportAll: () => saveFile('presets-carruseles.json', serializePresets(library.items), toast),
    exportOne(id) {
      const p = findPreset(id);
      if (p) saveFile(`preset-${slug(p.name)}.json`, serializePresets([p]), toast);
    },
    exportCurrent(sections) {
      guarded(() => {
        const p = createPreset({ name: 'Ajustes actuales', state: store.state, sections });
        return saveFile('ajustes-carruseles.json', serializePresets([p]), toast);
      });
    },

    openImport: () => $('#importInput').click(),

    importData(data) {
      guarded(() => {
        const { library: next, added, skipped } = importPresets(library, readPresetFile(data));
        if (!commitLibrary(next)) return;
        toast(
          `${added} ${added === 1 ? 'preset importado' : 'presets importados'}` +
            (skipped ? ` (${skipped} no cabían)` : '') +
            '. Aplícalos desde la lista.',
        );
      });
    },
  };

  const pwa = {
    status: storageStatus,
    canInstall: () => install.canInstall(),
    install: async () => {
      if (await install.install()) toast('App instalada.');
    },
    protect: async () => {
      const ok = await requestPersistence();
      toast(
        ok
          ? 'Datos protegidos: el navegador no los borrará por su cuenta.'
          : 'El navegador no ha concedido la protección. Instalar la app o usarla con frecuencia ayuda.',
        !ok,
      );
      panels.render();
    },
  };

  const ui = {
    get: () => prefs.get().ui,
    set(key, value) {
      applyUiSettings(prefs.setUi({ [key]: value }));
      mobile.refresh();
      panels.render();
    },
    reset() {
      applyUiSettings(prefs.resetUi());
      mobile.refresh();
      panels.render();
      toast('Configuración de la herramienta restablecida.');
    },
  };

  function stopVideo() {
    if (!assets.video) return;
    assets.video.pause();
    URL.revokeObjectURL(assets.video.src);
    assets.video = null;
  }

  /** Cambia al proyecto cargado (sin que abrirlo cuente como una edición). */
  function switchTo(loaded) {
    stopVideo();
    currentId = loaded.meta.id;
    lastThumbAt = 0;
    guideState = validGuide(loaded.meta.guide);
    projectSaver.withoutSaving(() => store.replace(loaded.state));
    guide.apply({ show: true });
    prefs.setLastProject(currentId);
    if (loaded.video) actions.attachVideo(loaded.video.blob, { persist: false });
    actions.ensureFontLoaded();
  }

  /** Biblioteca de proyectos: la usa la pantalla de inicio (fase 4) y la automatización. */
  const projectsApi = {
    available: !!projects,
    get currentId() {
      return currentId;
    },
    list: () => (projects ? projects.list() : Promise.resolve([])),

    /** Abre un proyecto de la biblioteca guardando antes el actual. */
    async open(id) {
      if (!projects || id === currentId) return false;
      await projectSaver.flush();
      const loaded = await projects.load(id);
      if (!loaded) {
        toast('No se encontró ese proyecto.', true);
        return false;
      }
      switchTo(loaded);
      return true;
    },

    /** Crea un proyecto (vacío con el estado inicial, o con `state`) y lo abre. */
    async create({ name, state, guide: startGuide = null } = {}) {
      if (!projects) return null;
      await projectSaver.flush();
      const meta = await projects.create({ name, state: state ?? initialState(), guide: startGuide });
      switchTo(await projects.load(meta.id));
      // Ficha completa (nº de slides y miniatura) desde el primer momento.
      return (await projects.save(meta.id, store.state, describeProject(true))) ?? meta;
    },

    /** Guarda ya lo pendiente del proyecto abierto (antes de listar o cambiar de pantalla). */
    flush: () => projectSaver?.flush() ?? Promise.resolve(),

    /** Descarga un proyecto de la biblioteca en JSON (sin el vídeo). */
    async exportJson(id) {
      if (!projects) return;
      if (id === currentId) await projectSaver.flush();
      const loaded = await projects.load(id);
      if (loaded) await saveFile(`${slug(loaded.meta.name) || 'proyecto'}.json`, serializeProject(loaded.state), toast);
    },

    async duplicate(id) {
      if (!projects) return null;
      if (id === currentId) await projectSaver.flush();
      return projects.duplicate(id);
    },

    rename: (id, name) => (projects ? projects.rename(id, name) : Promise.resolve(null)),

    /** Elimina un proyecto. Si era el abierto, pasa al más reciente (o crea uno nuevo si no queda ninguno). */
    async remove(id) {
      if (!projects) return false;
      const wasCurrent = id === currentId;
      if (wasCurrent) await projectSaver.flush();
      const ok = await projects.remove(id);
      if (ok && wasCurrent) {
        const rest = await projects.list();
        if (rest.length) switchTo(await projects.load(rest[0].id));
        else await projectsApi.create();
      }
      return ok;
    },
  };

  const actions = {
    presets,
    pwa,
    ui,
    projects: projectsApi,

    exportPngCurrent: () =>
      withStaticPreview(({ rc, slides }) => exportSlidePng({ rc, slide: slides[preview.current], notify: toast })),
    exportPngAll: () => withStaticPreview(({ rc, slides }) => exportAllPngZip({ rc, slides, notify: toast })),
    exportHtml: () => withStaticPreview(({ rc, slides }) => exportViewerHtml({ rc, slides, notify: toast })),
    exportJson: () => exportProjectJson({ state: store.state, notify: toast }),

    /** Compartir con la hoja nativa del sistema; si el navegador no puede, se descargan los archivos. */
    share: {
      async slides(list) {
        try {
          preview.syncVideoStatic();
          const { rc } = preview.carousel;
          const base = projectBaseName(store.state);
          const result = await shareSlides({
            slides: list,
            renderBlob: (s) => canvasToBlob(renderSlideToCanvas(rc, s)),
            fileName: (s) => `${base}-${slideFileName(s)}.png`,
            title: store.state.author.name,
          });
          if (result.status === 'unsupported') {
            toast('Este navegador no permite compartir archivos: se descargan las imágenes.');
            if (list.length > 1) await exportAllPngZip({ rc, slides: list, notify: toast });
            else await exportSlidePng({ rc, slide: list[0], notify: toast });
          } else if (result.status === 'error') toast('No se pudo compartir. Prueba a descargar las imágenes.', true);
        } catch {
          toast('No se pudo preparar el archivo para compartir.', true);
        }
      },
      all: () => actions.share.slides(preview.carousel.slides),
      one: (index) => actions.share.slides([preview.carousel.slides[index]]),
    },

    async copySlideImage(index) {
      try {
        await withStaticPreview(({ rc, slides }) => copySlideImage({ rc, slide: slides[index] }));
        toast('Imagen copiada al portapapeles.');
      } catch (e) {
        toast((e && e.message) || 'No se pudo copiar la imagen.', true);
      }
    },

    async exportVideo(kind) {
      const wasPlaying = preview.suspend();
      recorder.reset();
      try {
        await exportVideo(kind, {
          carousel: preview.carousel,
          current: preview.current,
          syncVideo: preview.syncVideoFor,
          ui: recorder,
          notify: toast,
        });
      } finally {
        recorder.reset();
        preview.resume(wasPlaying);
      }
    },

    openImport: () => $('#importInput').click(),

    /** Importa un proyecto (JSON o HTML exportado) o un archivo de presets/estilos. */
    async importFile(file) {
      try {
        const data = parseProjectFile(file.name, await file.text());
        if (isPresetFile(data)) {
          presets.importData(data);
          return;
        }
        const needsVideo = hydrate(data).media.type === 'video';
        if (projects) {
          // Con biblioteca, un archivo importado es un proyecto nuevo: el actual no se toca.
          const state = hydrate(data);
          await projectsApi.create({ name: defaultProjectName(state), state });
          home?.enterEditor();
        } else {
          store.replace(data);
        }
        toast(
          needsVideo
            ? 'Proyecto importado. Vuelve a subir el vídeo: no se guarda en el archivo.'
            : projects
              ? 'Proyecto importado como proyecto nuevo.'
              : 'Proyecto importado.',
        );
      } catch (e) {
        toast(
          e instanceof UserError ? e.message : 'El archivo no es un proyecto válido (JSON o HTML exportado).',
          true,
        );
      }
    },

    /** Vuelve al punto de partida: el preset inicial, si hay uno, o los valores estándar. */
    reset() {
      stopVideo();
      if (projects && currentId) projects.clearVideo(currentId).catch(() => {});
      const start = getDefaultPreset(library);
      const base = createDefaultState();
      store.replace(start ? applyPreset(base, start) : base);
      actions.ensureFontLoaded();
    },

    /** Vídeo subido por el usuario: se usa y, si hay biblioteca, se guarda con el proyecto. */
    setVideo: (file) => actions.attachVideo(file, { persist: true }),

    /** Carga un vídeo como medio del post. `persist`: guardarlo también en el proyecto abierto. */
    async attachVideo(file, { persist = false } = {}) {
      stopVideo();
      let failed = false;
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'auto';
      v.src = URL.createObjectURL(file);
      await new Promise((res, rej) => {
        v.onloadeddata = res;
        v.onerror = () => rej(new Error('No se pudo leer el vídeo.'));
      }).catch((e) => {
        failed = true;
        toast(e.message, true);
      });
      await resolveVideoDuration(v);
      v.addEventListener('seeked', () => {
        if (preview.mode === 'static') preview.renderStatic();
        preview.scheduleThumbs();
      });
      assets.video = v;
      if (persist) {
        store.set('media.videoTime', 0);
        if (projects && currentId && !failed) {
          projects.setVideo(currentId, file, file.name ?? '').catch(() => {
            toast('El vídeo no cabe en el almacenamiento: se verá ahora, pero no al volver a abrir el proyecto.', true);
          });
        }
      } else preview.invalidate(); // al reabrir un proyecto no hay cambio en el store: se redibuja a mano
      panels.render();
    },

    applyPreset(key) {
      const p = PRESETS[key];
      store.update((s) =>
        Object.assign(s.anim, { preset: key, order: p.order, stagger: p.stagger, ease: p.ease, el: clone(p.el) }),
      );
      panels.render();
      if (preview.mode !== 'anim') preview.setMode('anim');
      else preview.restart();
    },

    /** Las fuentes web se cargan bajo demanda; al llegar, se vuelve a dibujar. */
    ensureFontLoaded() {
      if (store.state.style.font === 'system' || !document.fonts) return;
      document.fonts.load(fontFn(store.state.style.font)(700, 40)).then(preview.invalidate, () => {});
    },

    /** Busca las tipografías instaladas en el dispositivo y las añade al selector. */
    async detectFonts() {
      toast('Buscando fuentes instaladas…');
      try {
        const { names, source } = await detectInstalledFonts();
        prefs.setInstalledFonts(names);
        panels.render();
        let message;
        if (source === 'system') message = `${names.length} fuentes encontradas en tu dispositivo.`;
        else if (names.length) {
          message = `Tu navegador no deja listar todas las fuentes: se han detectado ${names.length} habituales. Puedes escribir el nombre de cualquier otra.`;
        } else {
          message = 'Tu navegador no permite listar las fuentes instaladas. Escribe el nombre de la que quieras usar.';
        }
        toast(message, source !== 'system' && !names.length);
      } catch (e) {
        toast(
          e && e.name === 'NotAllowedError'
            ? 'No diste permiso para ver las fuentes instaladas. Puedes escribir su nombre a mano.'
            : 'No se pudieron leer las fuentes instaladas.',
          true,
        );
      }
    },

    /** Selector de proporción de la barra superior. */
    renderFormatSwitch() {
      $('#fmtTop').replaceChildren(
        ...Object.keys(FORMATS).map((fmt) =>
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': store.state.format === fmt ? 'true' : 'false',
              onclick: () => {
                store.set('format', fmt);
                actions.renderFormatSwitch();
                if (panels.active === 'style' || panels.active === 'export') panels.render();
              },
            },
            fmt,
          ),
        ),
      );
    },
  };

  // ---------- Modo guiado ----------

  /** Muestra en la vista previa la slide que corresponde al paso (portada, post o cierre). */
  function showStepSlide(kind) {
    if (!kind) return;
    preview.flush();
    const i = preview.carousel.slides.findIndex((s) => s.type === kind);
    if (i >= 0) preview.go(i);
  }

  const guide = {
    get active() {
      return !!guideState;
    },
    get template() {
      return guideState?.template ?? null;
    },
    get index() {
      return guideState?.step ?? 0;
    },
    get total() {
      return guideState ? getTemplate(guideState.template).steps.length : 0;
    },
    get step() {
      return getTemplate(guideState.template).steps[guideState.step];
    },
    /** Refleja el estado en la interfaz: atributo de <html>, panel y slide del paso. */
    apply({ show = false } = {}) {
      const root = document.documentElement;
      if (guideState) root.dataset.guided = 'on';
      else delete root.dataset.guided;
      panels.renderFromTop();
      if (show && guideState) {
        showStepSlide(guide.step.show);
        mobile.expand();
      }
    },
    go(n) {
      if (!guideState) return;
      guideState = { ...guideState, step: Math.min(Math.max(0, n), guide.total - 1) };
      if (projects && currentId) projects.setGuide(currentId, guideState).catch(() => {});
      guide.apply({ show: true });
    },
    next() {
      if (guide.index + 1 >= guide.total) guide.exit();
      else guide.go(guide.index + 1);
    },
    back: () => guide.go(guide.index - 1),
    /** Sale del paso a paso y deja el editor completo (el proyecto queda como está). */
    exit() {
      guideState = null;
      if (projects && currentId) projects.setGuide(currentId, null).catch(() => {});
      delete document.documentElement.dataset.guided;
      panels.select('post');
      mobile.expand();
    },
  };

  // ---------- Panel lateral ----------

  // Los campos repintan el panel, y el panel usa los campos: se enlazan de forma perezosa.
  const fields = createFields({ store, rerender: () => panels.render() });
  const panels = createPanelHost({ store, assets, actions, preview, prefs, guide, f: fields });

  // Móvil: hoja de exportar, vista completa, gestos y vista previa que se encoge.
  const exportSheet = createExportSheet({ store, preview, actions, panels });
  const mobile = createMobileShell({ preview, panels, openSlideMenu, openExport: () => exportSheet.open() });

  // ---------- Suscripciones y arranque ----------

  store.subscribe((_, reason) => {
    preview.invalidate();
    if (reason === 'replace') {
      panels.render();
      actions.renderFormatSwitch();
    }
  });

  $('#importInput').onchange = (e) => {
    const file = e.target.files[0];
    if (file) actions.importFile(file);
    e.target.value = '';
  };

  applyUiSettings(prefs.get().ui);
  // Si la apariencia es automática, sigue al sistema también para el color de la barra.
  window
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => applyUiSettings(prefs.get().ui));
  mountStaticIcons();
  // En el móvil «Exportar» abre la hoja inferior; en el escritorio, la pestaña Exportar.
  $('#exportGo').onclick = () => {
    if (mobile.isNarrow()) exportSheet.open();
    else if (guide.active)
      guide.go(guide.total - 1); // en el paso a paso, Exportar lleva a la pantalla final
    else panels.select('export');
  };
  $('#settingsGo').onclick = () => panels.select('settings');
  $('#slideMenuBtn').onclick = (e) => {
    const btn = e.currentTarget;
    openSlideMenu(
      { kind: 'slide', index: preview.current },
      { x: 0, y: 0, opener: btn, anchor: btn.getBoundingClientRect() },
    );
  };
  guide.apply();
  panels.renderTabs();
  panels.render();
  actions.renderFormatSwitch();
  preview.invalidate();
  actions.ensureFontLoaded();
  document.fonts?.ready?.then(() => {
    actions.ensureFontLoaded();
    preview.invalidate();
  });

  // Pantalla de inicio (si hay biblioteca) o directamente el editor (guardado clásico).
  const home = projects
    ? createHome({
        projects: projectsApi,
        menu,
        onImport: () => actions.openImport(),
        makeInitial: initialState,
        createMode: { get: () => prefs.get().createMode, set: (m) => prefs.setCreateMode(m) },
      })
    : null;
  if (home) home.start();
  else {
    document.documentElement.dataset.screen = 'editor';
    document.documentElement.dataset.library = 'off';
  }

  // Un proyecto sin miniatura (recién creado o importado) la recibe en cuanto hay tipografías cargadas.
  if (projects && !boot.current.meta.thumb) {
    const id = currentId;
    document.fonts?.ready?.then(async () => {
      if (id !== currentId) return;
      await projects.save(id, store.state, describeProject(true)).catch(() => {});
    });
  }

  // Vídeo guardado con el proyecto abierto.
  if (boot?.current.video) actions.attachVideo(boot.current.video.blob, { persist: false });

  return { store, assets, preview, actions };
}
