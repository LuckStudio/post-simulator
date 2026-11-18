import { FORMATS } from './core/constants.js';
import { UserError } from './core/errors.js';
import { clone, slug } from './core/utils.js';
import { PRESETS } from './animation/presets.js';
import { createStore } from './state/store.js';
import { createDefaultState } from './state/defaults.js';
import { autosave, loadSaved } from './state/persistence.js';
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
import { exportProjectJson, exportViewerHtml } from './export/project.js';
import { exportVideo } from './export/video.js';
import { saveFile } from './io/files.js';
import { detectInstalledFonts } from './io/fonts.js';
import { parseProjectFile } from './io/project.js';
import { createInstallPrompt, requestPersistence, storageStatus } from './pwa.js';
import { applyUiSettings } from './ui/appearance.js';
import { createContextMenu } from './ui/contextMenu.js';
import { $, h } from './ui/dom.js';
import { createRecorderDialog, toast } from './ui/feedback.js';
import { createFields } from './ui/fields.js';
import { mountStaticIcons } from './ui/icons.js';
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

/**
 * Punto de composición: crea el store, los recursos, la vista previa y el panel,
 * y define las acciones de alto nivel (exportar, importar, vídeo, presets…).
 */
export function startApp() {
  const prefs = createPrefs();
  let library = loadLibrary();

  // Proyecto de partida: el guardado en este navegador o, si no hay, el preset marcado como inicial.
  const startPreset = getDefaultPreset(library);
  const store = createStore(loadSaved() ?? (startPreset ? applyPreset(createDefaultState(), startPreset) : undefined));
  const assets = createAssets(() => preview.invalidate());
  const recorder = createRecorderDialog();
  const menu = createContextMenu();
  const install = createInstallPrompt(() => {
    if (panels.active === 'presets') panels.render();
  });

  autosave(store, {
    onQuotaExceeded: () => toast('El proyecto pesa demasiado para guardarse solo. Usa Exportar > Proyecto JSON.', true),
  });

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
      panels.render();
    },
    reset() {
      applyUiSettings(prefs.resetUi());
      panels.render();
      toast('Configuración de la herramienta restablecida.');
    },
  };

  const actions = {
    presets,
    pwa,
    ui,

    exportPngCurrent: () =>
      withStaticPreview(({ rc, slides }) => exportSlidePng({ rc, slide: slides[preview.current], notify: toast })),
    exportPngAll: () => withStaticPreview(({ rc, slides }) => exportAllPngZip({ rc, slides, notify: toast })),
    exportHtml: () => withStaticPreview(({ rc, slides }) => exportViewerHtml({ rc, slides, notify: toast })),
    exportJson: () => exportProjectJson({ state: store.state, notify: toast }),

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
        store.replace(data);
        if (store.state.media.type === 'video' && !assets.video) {
          toast('Proyecto importado. Vuelve a subir el vídeo: no se guarda en el archivo.');
        } else toast('Proyecto importado.');
      } catch (e) {
        toast(
          e instanceof UserError ? e.message : 'El archivo no es un proyecto válido (JSON o HTML exportado).',
          true,
        );
      }
    },

    /** Vuelve al punto de partida: el preset inicial, si hay uno, o los valores estándar. */
    reset() {
      if (assets.video) {
        assets.video.pause();
        assets.video = null;
      }
      const start = getDefaultPreset(library);
      const base = createDefaultState();
      store.replace(start ? applyPreset(base, start) : base);
      actions.ensureFontLoaded();
    },

    async setVideo(file) {
      if (assets.video) {
        assets.video.pause();
        URL.revokeObjectURL(assets.video.src);
      }
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'auto';
      v.src = URL.createObjectURL(file);
      await new Promise((res, rej) => {
        v.onloadeddata = res;
        v.onerror = () => rej(new Error('No se pudo leer el vídeo.'));
      }).catch((e) => toast(e.message, true));
      await resolveVideoDuration(v);
      v.addEventListener('seeked', () => {
        if (preview.mode === 'static') preview.renderStatic();
        preview.scheduleThumbs();
      });
      assets.video = v;
      store.set('media.videoTime', 0);
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

  // ---------- Panel lateral ----------

  // Los campos repintan el panel, y el panel usa los campos: se enlazan de forma perezosa.
  const fields = createFields({ store, rerender: () => panels.render() });
  const panels = createPanelHost({ store, assets, actions, preview, prefs, f: fields });

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
  $('#exportGo').onclick = () => panels.select('export', { reveal: true });
  $('#settingsGo').onclick = () => panels.select('settings', { reveal: true });
  $('#slideMenuBtn').onclick = (e) => {
    const btn = e.currentTarget;
    openSlideMenu(
      { kind: 'slide', index: preview.current },
      { x: 0, y: 0, opener: btn, anchor: btn.getBoundingClientRect() },
    );
  };
  panels.renderTabs();
  panels.render();
  actions.renderFormatSwitch();
  preview.invalidate();
  actions.ensureFontLoaded();
  document.fonts?.ready?.then(() => {
    actions.ensureFontLoaded();
    preview.invalidate();
  });

  return { store, assets, preview, actions };
}
