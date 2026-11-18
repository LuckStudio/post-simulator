import { clamp } from '../core/utils.js';
import { buildCarousel, drawSlide } from '../render/carousel.js';
import { canvasSize } from '../render/context.js';
import { $, $$ } from './dom.js';

const THUMB_HEIGHT = 96;

/**
 * Controlador de la vista previa: construye el carrusel a partir del estado,
 * dibuja la slide actual, la tira de miniaturas, la navegación y la
 * reproducción animada (incluido el vídeo del post).
 *
 * @param {{store: ReturnType<import('../state/store.js').createStore>,
 *          assets: ReturnType<import('../render/assets.js').createAssets>}} deps
 */
export function createPreview({ store, assets }) {
  const canvas = $('#preview');
  const pctx = canvas.getContext('2d');
  const wrap = $('#cwrap');
  const film = $('#film');
  const thumbBuf = document.createElement('canvas');

  /** @type {import('../render/carousel.js').Carousel} */
  let carousel = { rc: null, slides: [] };
  const view = { cur: 0, mode: 'static', playing: false, playAll: false, t0: 0, pausedAt: 0 };
  let renderQueued = false;
  let thumbTimer = null;

  // ---------- Construcción y dibujo ----------

  function rebuild() {
    carousel = buildCarousel(store.state, assets);
    const n = carousel.slides.length;
    if (view.cur >= n) view.cur = Math.max(0, n - 1);
  }

  /** Programa una reconstrucción en el siguiente fotograma (agrupa cambios seguidos). */
  function invalidate() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      rebuild();
      fitCanvas();
      updateNav();
      if (view.mode === 'static' || !view.playing) renderStatic();
      scheduleThumbs();
    });
  }

  function renderStatic() {
    const sl = carousel.slides[view.cur];
    if (!sl) return;
    syncVideoStatic();
    drawSlide(pctx, carousel.rc, sl, null);
  }

  function fitCanvas() {
    const { W, H } = canvasSize(store.state.format);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const aw = wrap.clientWidth - 36;
    const ah = wrap.clientHeight - 16;
    const sc = Math.max(0.05, Math.min(aw / W, ah / H));
    canvas.style.width = Math.floor(W * sc) + 'px';
    canvas.style.height = Math.floor(H * sc) + 'px';
  }

  // ---------- Navegación ----------

  function updateNav() {
    const n = carousel.slides.length;
    const sl = carousel.slides[view.cur];
    $('#count').textContent = n ? `${sl.label} · ${view.cur + 1} de ${n}` : '—';
    $('#prevBtn').disabled = view.cur <= 0;
    $('#nextBtn').disabled = view.cur >= n - 1;
    $$('#film button').forEach((b, i) => b.setAttribute('aria-current', i === view.cur ? 'true' : 'false'));
  }

  function go(i) {
    view.cur = clamp(i, 0, carousel.slides.length - 1);
    updateNav();
    if (view.mode === 'anim') restart();
    else renderStatic();
  }

  function scheduleThumbs() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(renderThumbs, 220);
  }

  function renderThumbs() {
    const { rc, slides } = carousel;
    if (!rc) return;
    const { W, H } = rc;
    thumbBuf.width = W;
    thumbBuf.height = H;
    const bctx = thumbBuf.getContext('2d');
    while (film.children.length > slides.length) film.lastChild.remove();
    slides.forEach((sl, i) => {
      let btn = film.children[i];
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.append(document.createElement('canvas'), document.createElement('span'));
        btn.onclick = () => go(Number(btn.dataset.i));
        film.append(btn);
      }
      btn.dataset.i = i;
      btn.lastChild.textContent = sl.label;
      btn.setAttribute('aria-label', `Ir a ${sl.label}`);
      const c = btn.firstChild;
      const th = THUMB_HEIGHT * 2;
      const tw = Math.round((th * W) / H);
      c.width = tw;
      c.height = th;
      c.style.height = THUMB_HEIGHT + 'px';
      c.style.width = Math.round((THUMB_HEIGHT * W) / H) + 'px';
      drawSlide(bctx, rc, sl, null);
      c.getContext('2d').drawImage(thumbBuf, 0, 0, tw, th);
    });
    updateNav();
  }

  // ---------- Vídeo del post ----------

  const slideHasVideo = (sl) => !!(sl && store.state.media.type === 'video' && assets.video && sl.hasMedia);

  /** Arranca el vídeo desde el principio si la slide lo muestra; si no, lo pausa. */
  function syncVideoFor(sl) {
    const v = assets.video;
    if (!v) return;
    if (slideHasVideo(sl)) {
      try {
        v.currentTime = 0;
      } catch {
        /* el vídeo aún no admite búsqueda */
      }
      v.play().catch(() => {});
    } else v.pause();
  }

  /** En modo estático el vídeo se queda pausado en el fotograma elegido. */
  function syncVideoStatic() {
    const v = assets.video;
    if (!v) return;
    if (!v.paused) v.pause();
    const tt = clamp(store.state.media.videoTime, 0, v.duration || 0);
    if (Math.abs(v.currentTime - tt) > 0.05) {
      try {
        v.currentTime = tt;
      } catch {
        /* idem */
      }
    }
  }

  // ---------- Reproducción animada ----------

  function setMode(m) {
    view.mode = m;
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
    const anim = m === 'anim';
    $('#playBtn').hidden = !anim;
    $('#replayBtn').hidden = !anim;
    $('#allWrap').hidden = !anim;
    if (anim) restart();
    else {
      view.playing = false;
      renderStatic();
    }
  }

  function restart() {
    view.playing = true;
    $('#playBtn').textContent = 'Pausar';
    view.t0 = performance.now();
    view.pausedAt = 0;
    syncVideoFor(carousel.slides[view.cur]);
    requestAnimationFrame(tick);
  }

  function togglePlay() {
    if (view.playing) {
      view.playing = false;
      $('#playBtn').textContent = 'Reproducir';
      assets.video?.pause();
    } else {
      view.playing = true;
      $('#playBtn').textContent = 'Pausar';
      view.t0 = performance.now() - (view.pausedAt || 0) * 1000;
      if (assets.video && slideHasVideo(carousel.slides[view.cur])) assets.video.play().catch(() => {});
      requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    if (!view.playing || view.mode !== 'anim') return;
    const sl = carousel.slides[view.cur];
    if (!sl) return;
    let t = (now - view.t0) / 1000;
    if (t > sl.total) {
      if (view.playAll && carousel.slides.length > 1) {
        view.cur = (view.cur + 1) % carousel.slides.length;
        updateNav();
      }
      view.t0 = now;
      t = 0;
      syncVideoFor(carousel.slides[view.cur]);
    }
    view.pausedAt = t;
    drawSlide(pctx, carousel.rc, carousel.slides[view.cur], t);
    requestAnimationFrame(tick);
  }

  /** Detiene la reproducción (p. ej. durante una exportación) y devuelve si estaba sonando. */
  function suspend() {
    const was = view.playing;
    view.playing = false;
    return was;
  }

  function resume(wasPlaying) {
    if (wasPlaying && view.mode === 'anim') restart();
    else renderStatic();
  }

  // ---------- Eventos ----------

  new ResizeObserver(() => fitCanvas()).observe(wrap);
  $('#prevBtn').onclick = () => go(view.cur - 1);
  $('#nextBtn').onclick = () => go(view.cur + 1);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowLeft') go(view.cur - 1);
    if (e.key === 'ArrowRight') go(view.cur + 1);
  });
  $$('#modeSeg button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $('#playBtn').onclick = togglePlay;
  $('#replayBtn').onclick = () => restart();
  $('#playAll').onchange = (e) => {
    view.playAll = e.target.checked;
  };

  return {
    get carousel() {
      return carousel;
    },
    get current() {
      return view.cur;
    },
    get mode() {
      return view.mode;
    },
    invalidate,
    renderStatic,
    scheduleThumbs,
    setMode,
    restart,
    suspend,
    resume,
    syncVideoFor,
    syncVideoStatic,
  };
}
