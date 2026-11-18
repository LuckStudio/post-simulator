import JSZip from 'jszip';
import { clamp } from '../core/utils.js';
import { EASE } from '../animation/easing.js';
import { drawSlide } from '../render/carousel.js';
import { projectBaseName, saveFile, slideFileName } from '../io/files.js';

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.640028',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export const UNSUPPORTED_MSG = 'Este navegador no permite grabar vídeo. Prueba con Chrome o Edge.';

/** Mejor formato de vídeo que admite este navegador (MP4 en Chrome, WebM en otros) o null. */
export function pickMime() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

export const videoExt = (mime) => (mime && mime.startsWith('video/mp4') ? 'mp4' : 'webm');

/** Duración de la transición entre slides en el vídeo continuo. */
const transitionDuration = (transition) => (transition === 'corte' ? 0 : 0.6);

/**
 * Graba un canvas en tiempo real durante `duration` segundos.
 * `drawAt(t)` dibuja el fotograma del segundo t.
 */
function recordCanvas(canvas, { duration, fps, drawAt, onProgress, isCancelled }) {
  return new Promise((resolve, reject) => {
    const mime = pickMime();
    if (!mime) {
      reject(new Error(UNSUPPORTED_MSG));
      return;
    }
    const stream = canvas.captureStream(Number(fps) || 30);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
    const chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    };
    rec.onerror = (e) => reject(e.error || e);

    drawAt(0);
    rec.start(250);
    const t0 = performance.now();
    const step = () => {
      if (isCancelled()) {
        rec.stop();
        return;
      }
      const t = (performance.now() - t0) / 1000;
      drawAt(Math.min(t, duration));
      onProgress(Math.min(1, t / duration));
      if (t >= duration + 0.15) {
        rec.stop();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/**
 * Exporta vídeo.
 * @param {'current'|'each'|'all'} kind  Slide actual, una por slide (ZIP) o continuo con transiciones.
 * @param {object} deps
 * @param {import('../render/carousel.js').Carousel} deps.carousel
 * @param {number} deps.current  Índice de la slide actual.
 * @param {(slide) => void} deps.syncVideo  Arranca o para el vídeo del post según la slide.
 * @param {{open(text:string):void, progress(f:number):void, close():void, isCancelled():boolean}} deps.ui
 * @param {(msg:string, isError?:boolean) => void} deps.notify
 */
export async function exportVideo(kind, { carousel, current, syncVideo, ui, notify }) {
  const mime = pickMime();
  if (!mime) {
    notify(UNSUPPORTED_MSG, true);
    return;
  }
  const { rc, slides } = carousel;
  const { W, H, state } = rc;
  const fps = state.anim.fps;
  const ext = videoExt(mime);
  const base = projectBaseName(state);

  // El canvas tiene que estar en el documento para que captureStream emita fotogramas.
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  c.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px';
  document.body.append(c);
  const ctx = c.getContext('2d');

  try {
    if (kind === 'current' || kind === 'each') {
      const list = kind === 'current' ? [slides[current]] : slides;
      const blobs = [];
      for (let i = 0; i < list.length; i++) {
        const sl = list[i];
        if (ui.isCancelled()) break;
        ui.open(`Grabando ${sl.label} (${i + 1} de ${list.length}). Mantén esta pestaña visible.`);
        syncVideo(sl);
        const blob = await recordCanvas(c, {
          duration: sl.total,
          fps,
          drawAt: (t) => drawSlide(ctx, rc, sl, t),
          onProgress: (p) => ui.progress((i + p) / list.length),
          isCancelled: ui.isCancelled,
        });
        blobs.push([sl, blob]);
      }
      ui.close();
      if (ui.isCancelled()) {
        notify('Grabación cancelada.');
        return;
      }
      if (blobs.length === 1) {
        await saveFile(`${base}-${slideFileName(blobs[0][0])}.${ext}`, blobs[0][1], notify);
      } else {
        const zip = new JSZip();
        blobs.forEach(([sl, b]) => zip.file(`${slideFileName(sl)}.${ext}`, b));
        await saveFile(`${base}-videos.zip`, await zip.generateAsync({ type: 'blob' }), notify);
      }
      return;
    }

    // Vídeo continuo con transición entre slides.
    const transition = state.anim.transition;
    const tr = transitionDuration(transition);
    const segs = [];
    let acc = 0;
    slides.forEach((sl, i) => {
      segs.push({ sl, start: acc });
      acc += sl.total + (i < slides.length - 1 ? tr : 0);
    });
    const total = acc;
    const [bufA, bufB] = [0, 1].map(() => {
      const b = document.createElement('canvas');
      b.width = W;
      b.height = H;
      return b;
    });
    const aCtx = bufA.getContext('2d');
    const bCtx = bufB.getContext('2d');
    let lastIdx = -1;

    ui.open(`Grabando el carrusel completo (${total.toFixed(1)} s). Mantén esta pestaña visible.`);
    const blob = await recordCanvas(c, {
      duration: total,
      fps,
      isCancelled: ui.isCancelled,
      onProgress: (p) => ui.progress(p),
      drawAt: (t) => {
        let i = segs.length - 1;
        for (let k = 0; k < segs.length; k++) {
          if (t < segs[k].start + segs[k].sl.total + (k < segs.length - 1 ? tr : 0)) {
            i = k;
            break;
          }
        }
        const s = segs[i];
        const lt = t - s.start;
        if (i !== lastIdx) {
          lastIdx = i;
          syncVideo(s.sl);
        }
        if (lt <= s.sl.total || i === segs.length - 1) {
          drawSlide(ctx, rc, s.sl, Math.min(lt, s.sl.total));
          return;
        }
        const e = EASE.inOutSine(clamp((lt - s.sl.total) / tr));
        const next = segs[i + 1].sl;
        drawSlide(aCtx, rc, s.sl, s.sl.total);
        drawSlide(bCtx, rc, next, 0);
        ctx.clearRect(0, 0, W, H);
        if (transition === 'fundido') {
          ctx.drawImage(bufA, 0, 0);
          ctx.globalAlpha = e;
          ctx.drawImage(bufB, 0, 0);
          ctx.globalAlpha = 1;
        } else {
          ctx.drawImage(bufA, -W * e, 0);
          ctx.drawImage(bufB, W * (1 - e), 0);
        }
      },
    });
    ui.close();
    if (ui.isCancelled()) {
      notify('Grabación cancelada.');
      return;
    }
    await saveFile(`${base}-carrusel.${ext}`, blob, notify);
  } catch (e) {
    ui.close();
    notify((e && e.message) || 'No se pudo grabar el vídeo.', true);
  } finally {
    c.remove();
  }
}
