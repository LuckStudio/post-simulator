import { $ } from './dom.js';
import { attachGestures } from './gestures.js';
import { overlays } from './overlays.js';
import { editPanelFor } from './slideMenu.js';

const NARROW = '(max-width: 900px)';
/** Alto de la tira compacta de la vista previa (px): ver `[data-view='compact']` en el CSS. */
const COMPACT_HEIGHT = 104;

/**
 * Comportamiento propio del móvil (pantallas de hasta 900 px). Reutiliza el mismo lienzo, los mismos
 * paneles y las mismas acciones que el escritorio: aquí solo se decide cómo se colocan y cómo se tocan.
 *
 * - La vista previa se encoge a una tira fija al bajar por los campos (o al abrir el teclado).
 * - Tocar la vista previa abre la vista completa; deslizar cambia de slide; mantener pulsado abre
 *   las acciones de la slide.
 * - Con «Vista previa flotante» (Configuración) los campos ocupan toda la pantalla y la vista previa es
 *   una tarjeta pequeña que se arrastra.
 * - La altura de la aplicación sigue a la visible (teclado y barras del navegador).
 */
export function createMobileShell({ preview, panels, openSlideMenu, openExport }) {
  const root = document.documentElement;
  const mq = window.matchMedia(NARROW);
  const vv = window.visualViewport;
  const panelBody = $('#panel');
  const cwrap = $('#cwrap');
  const stage = $('#fullStage');
  const fullEl = $('#fullview');

  let view = 'expanded'; // 'expanded' | 'compact'
  let keyboard = false;
  let fullOpen = false;
  let lockUntil = 0; // ignora el scroll un momento tras expandir a mano
  let offset = { x: 0, y: 0 }; // posición de la vista previa flotante

  root.dataset.view = view;
  const isNarrow = () => mq.matches;
  const floating = () => root.dataset.preview === 'floating';

  function setView(v) {
    if (v === view) return;
    view = v;
    root.dataset.view = v;
  }

  function expand() {
    lockUntil = performance.now() + 400;
    setView('expanded');
    panelBody.scrollTop = 0;
  }

  // ---------- La vista previa se encoge al bajar por los campos ----------

  const previewBlockHeight = () => cwrap.offsetHeight + ($('.dock')?.offsetHeight ?? 0);

  panelBody.addEventListener(
    'scroll',
    () => {
      if (!isNarrow() || floating() || keyboard || performance.now() < lockUntil) return;
      const y = panelBody.scrollTop;
      if (view === 'expanded') {
        // Solo se encoge si, una vez encogida, todavía queda recorrido por bajar: si no, al
        // ganar altura el panel se quedaría sin scroll y volvería a expandirse (parpadeo).
        const range = panelBody.scrollHeight - panelBody.clientHeight;
        const gain = previewBlockHeight() - COMPACT_HEIGHT;
        if (y > 32 && range > gain + 80) setView('compact');
      } else if (y < 4) setView('expanded');
    },
    { passive: true },
  );

  // ---------- Altura visible, teclado y campos ----------

  function syncViewport() {
    const h = vv ? vv.height : window.innerHeight;
    root.style.setProperty('--app-h', `${Math.round(h)}px`);
    root.style.setProperty('--app-top', `${Math.round(vv ? vv.offsetTop : 0)}px`);
    const kb = isNarrow() && !!vv && window.innerHeight - vv.height > 120;
    if (kb === keyboard) return;
    keyboard = kb;
    root.dataset.keyboard = kb ? 'open' : 'closed';
    // Con el teclado abierto hay poco sitio: la vista previa pasa a la tira compacta.
    if (kb) setView('compact');
    else setView(panelBody.scrollTop < 4 ? 'expanded' : 'compact');
  }
  vv?.addEventListener('resize', syncViewport);
  vv?.addEventListener('scroll', syncViewport);
  window.addEventListener('resize', syncViewport);
  syncViewport();

  // Al enfocar un campo se desplaza hasta dejarlo a la vista (el teclado tarda en aparecer).
  panelBody.addEventListener('focusin', (e) => {
    const t = e.target;
    if (
      !isNarrow() ||
      !t.matches?.('input:not([type=checkbox]):not([type=range]):not([type=color]), textarea, select')
    ) {
      return;
    }
    setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  });

  // ---------- Vista completa ----------

  const onKey = (e) => {
    if (e.key === 'Escape' && !document.querySelector('.sheet-root')) closeFull();
  };
  const onBack = () => finishFull();

  function finishFull() {
    if (!fullOpen) return;
    fullOpen = false;
    fullEl.hidden = true;
    delete root.dataset.full;
    document.removeEventListener('keydown', onKey);
    preview.setHost(cwrap);
  }

  function closeFull() {
    if (!fullOpen) return;
    overlays.release(onBack);
    finishFull();
  }

  function openFull() {
    if (fullOpen) return;
    fullOpen = true;
    fullEl.hidden = false;
    root.dataset.full = 'open';
    preview.setHost(stage);
    overlays.push(onBack);
    document.addEventListener('keydown', onKey);
    $('#fullClose').focus();
  }

  $('#fullClose').onclick = closeFull;
  $('#fullPlay').onclick = () => preview.playSlide(preview.current);
  $('#fullEdit').onclick = () => {
    const slide = preview.carousel.slides[preview.current];
    closeFull();
    panels.select(editPanelFor(slide));
  };
  $('#fullExport').onclick = () => {
    closeFull();
    openExport();
  };

  // ---------- Gestos sobre la vista previa ----------

  const gestures = {
    onTap: () => {
      if (!isNarrow() || fullOpen) return;
      if (view === 'compact' && !floating()) expand();
      else openFull();
    },
    onSwipe: (dir) => {
      if (!isNarrow() || (floating() && !fullOpen)) return;
      preview.go(preview.current + (dir === 'next' ? 1 : -1));
    },
    onLongPress: () => {
      if (!isNarrow()) return;
      openSlideMenu({ kind: 'slide', index: preview.current }, { x: 0, y: 0, opener: null });
    },
    canSwipe: () => !(floating() && !fullOpen),
    canDrag: () => isNarrow() && floating() && !fullOpen,
    onDrag: ({ dx, dy }) => {
      offset = { x: offset.x + dx, y: offset.y + dy };
      applyFloat();
    },
  };
  attachGestures(cwrap, gestures);
  attachGestures(stage, gestures);

  /** Coloca la vista previa flotante sin dejar que se salga de la pantalla. */
  function applyFloat() {
    cwrap.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    const r = cwrap.getBoundingClientRect();
    const m = 8;
    const vw = window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    let cx = 0;
    let cy = 0;
    if (r.left < m) cx = m - r.left;
    else if (r.right > vw - m) cx = vw - m - r.right;
    if (r.top < m) cy = m - r.top;
    else if (r.bottom > vh - m) cy = vh - m - r.bottom;
    if (cx || cy) {
      offset = { x: offset.x + cx, y: offset.y + cy };
      cwrap.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    }
  }

  return {
    isNarrow,
    openFull,
    closeFull,
    expand,
    /** Se llama al cambiar un ajuste de la interfaz (p. ej. la vista previa flotante). */
    refresh() {
      if (!floating()) {
        offset = { x: 0, y: 0 };
        cwrap.style.transform = '';
      }
      if (floating()) setView('expanded');
    },
    get view() {
      return view;
    },
  };
}
