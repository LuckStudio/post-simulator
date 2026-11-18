import { FORMATS } from './core/constants.js';
import { PRESETS } from './animation/presets.js';
import { clone } from './core/utils.js';
import { createStore } from './state/store.js';
import { autosave, loadSaved } from './state/persistence.js';
import { createAssets } from './render/assets.js';
import { fontFn } from './render/context.js';
import { exportAllPngZip, exportSlidePng } from './export/images.js';
import { exportProjectJson, exportViewerHtml } from './export/project.js';
import { exportVideo } from './export/video.js';
import { UserError, parseProjectFile } from './io/project.js';
import { $, h } from './ui/dom.js';
import { createRecorderDialog, toast } from './ui/feedback.js';
import { createFields } from './ui/fields.js';
import { createPanelHost } from './ui/panels/index.js';
import { createPreview } from './ui/preview.js';

/**
 * Punto de composición: crea el store, los recursos, la vista previa y el panel,
 * y define las acciones de alto nivel (exportar, importar, vídeo, presets…).
 */
export function startApp() {
  const store = createStore(loadSaved() ?? undefined);
  const assets = createAssets(() => preview.invalidate());
  const preview = createPreview({ store, assets });
  const recorder = createRecorderDialog();

  autosave(store, {
    onQuotaExceeded: () => toast('El proyecto pesa demasiado para guardarse solo. Usa Exportar > Proyecto JSON.', true),
  });

  // ---------- Acciones ----------

  /** Ejecuta una exportación con la vista previa parada y el vídeo en su fotograma estático. */
  const withStaticPreview = async (fn) => {
    preview.syncVideoStatic();
    await fn(preview.carousel);
  };

  const actions = {
    exportPngCurrent: () =>
      withStaticPreview(({ rc, slides }) => exportSlidePng({ rc, slide: slides[preview.current], notify: toast })),
    exportPngAll: () => withStaticPreview(({ rc, slides }) => exportAllPngZip({ rc, slides, notify: toast })),
    exportHtml: () => withStaticPreview(({ rc, slides }) => exportViewerHtml({ rc, slides, notify: toast })),
    exportJson: () => exportProjectJson({ state: store.state, notify: toast }),

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

    async importFile(file) {
      try {
        store.replace(parseProjectFile(file.name, await file.text()));
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

    reset() {
      if (assets.video) {
        assets.video.pause();
        assets.video = null;
      }
      store.reset();
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
      document.fonts.load(fontFn(store.state.style.font)(700, 40)).then(preview.invalidate);
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
  const panels = createPanelHost({ store, assets, actions, preview, f: fields });

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

  panels.renderTabs();
  panels.render();
  actions.renderFormatSwitch();
  preview.invalidate();
  document.fonts?.ready?.then(() => {
    actions.ensureFontLoaded();
    preview.invalidate();
  });

  return { store, assets, preview, actions };
}
