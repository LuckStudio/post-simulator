import { splitGraphemes } from '../core/graphemes.js';
import { clamp } from '../core/utils.js';
import { EASE } from '../animation/easing.js';
import { isTextAnim } from '../animation/presets.js';

/**
 * Una línea maquetada: lista de palabras con su ancho medido.
 * @typedef {{t:string, w:number, acc:boolean, n:number}} Word
 * @typedef {{words: Word[], w:number}} Line
 */

let measureCtx = null;

/** Contexto 2D compartido para medir texto. Los tests pueden inyectar uno falso. */
export function measureContext() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}
export function setMeasureContext(ctx) {
  measureCtx = ctx;
}

const ACCENT_RE = /^(#|@|https?:\/\/|www\.)/i;

/** Modo de dibujo del texto según el tipo de animación del elemento. */
export const textMode = (type) => (isTextAnim(type) ? type : 'static');

/**
 * Parte un texto en líneas que caben en `maxW`. Respeta los saltos de línea
 * (una línea vacía = párrafo) y corta palabras más largas que la línea.
 * @returns {Line[]}
 */
export function wrapText(rc, text, maxW, size, weight = 400, accent = false) {
  const ctx = measureContext();
  ctx.font = rc.font(weight, size);
  const highlight = accent && rc.state.post.hashtags;
  const sp = ctx.measureText(' ').width;
  const out = [];
  const mk = (t, w) => ({
    t,
    w: w ?? ctx.measureText(t).width,
    acc: !!highlight && ACCENT_RE.test(t),
    n: splitGraphemes(t).length,
  });

  for (const para of String(text || '').split('\n')) {
    const words = para.split(' ').filter(Boolean);
    if (!words.length) {
      out.push({ words: [], w: 0 });
      continue;
    }
    let cur = [];
    let cw = 0;
    const push = () => {
      if (cur.length) out.push({ words: cur, w: cw });
      cur = [];
      cw = 0;
    };
    for (const t of words) {
      const ww = ctx.measureText(t).width;
      if (ww > maxW) {
        push();
        let chunk = '';
        for (const ch of splitGraphemes(t)) {
          const test = chunk + ch;
          if (chunk && ctx.measureText(test).width > maxW) {
            out.push({ words: [mk(chunk)], w: ctx.measureText(chunk).width });
            chunk = ch;
          } else chunk = test;
        }
        if (chunk) {
          cur = [mk(chunk)];
          cw = ctx.measureText(chunk).width;
        }
        continue;
      }
      const add = (cur.length ? sp : 0) + ww;
      if (cur.length && cw + add > maxW) {
        push();
        cur = [mk(t, ww)];
        cw = ww;
      } else {
        cur.push(mk(t, ww));
        cw += add;
      }
    }
    push();
  }
  return out;
}

/** Quita las líneas vacías del principio y del final. */
export function trimBlank(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].words.length) a++;
  while (b > a && !lines[b - 1].words.length) b--;
  return lines.slice(a, b);
}

/** Número de caracteres visibles (incluye espacios y saltos), para la máquina de escribir. */
export function charCount(lines) {
  return (
    lines.reduce((a, l) => a + l.words.reduce((b, w) => b + w.n, 0) + Math.max(0, l.words.length - 1), 0) +
    Math.max(0, lines.length - 1)
  );
}

/** Recorta la última línea para que quepa "… más" al final. */
export function truncateMore(rc, lines, maxW, size) {
  const ctx = measureContext();
  ctx.font = rc.font(400, size);
  const sp = ctx.measureText(' ').width;
  const moreW = ctx.measureText('… más').width + sp;
  const last = lines[lines.length - 1];
  if (!last) return lines;
  const words = [...last.words];
  let w = last.w;
  while (words.length && w + moreW > maxW) {
    const r = words.pop();
    w -= r.w + (words.length ? sp : 0);
  }
  lines[lines.length - 1] = { words, w: Math.max(0, w) };
  return lines;
}

/**
 * Dibuja líneas maquetadas. Con `mode` = 'typewriter' | 'words' | 'lines' y
 * `p` ∈ [0,1] dibuja el estado intermedio de esa animación.
 */
export function drawText(ctx, rc, lines, o) {
  const { x, y, size, lh, weight = 400, color, accent = color, align = 'left', w = 0 } = o;
  const mode = o.mode || 'static';
  const p = o.p ?? 1;
  ctx.font = rc.font(weight, size);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const sp = ctx.measureText(' ').width;
  const total = charCount(lines) || 1;
  const nWords = lines.reduce((a, l) => a + l.words.length, 0) || 1;
  let reveal = mode === 'typewriter' ? Math.floor(p * total + 1e-6) : Infinity;
  let caret = null;
  let wi = 0;
  let endX = x;
  let endTop = y;

  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li];
    const top = y + li * lh;
    const base = top + lh * 0.5 + size * 0.36;
    let cx = align === 'center' ? x + (w - ln.w) / 2 : x;
    if (reveal <= 0 && mode === 'typewriter') {
      if (!caret) caret = { x: cx, top };
      break;
    }
    ctx.save();
    if (mode === 'lines') {
      const L = lines.length;
      const st = L > 1 ? (li / L) * 0.6 : 0;
      const e = EASE.outCubic(clamp((p - st) / 0.4));
      ctx.globalAlpha *= e;
      ctx.translate(0, (1 - e) * size * 0.9);
    }
    for (let k = 0; k < ln.words.length; k++) {
      const wd = ln.words[k];
      if (k > 0) {
        cx += sp;
        if (mode === 'typewriter') {
          reveal--;
          if (reveal <= 0) {
            caret = { x: cx, top };
            break;
          }
        }
      }
      ctx.fillStyle = wd.acc ? accent : color;
      if (mode === 'typewriter') {
        if (reveal >= wd.n) {
          ctx.fillText(wd.t, cx, base);
          reveal -= wd.n;
          cx += wd.w;
        } else {
          const part = splitGraphemes(wd.t).slice(0, Math.max(0, reveal)).join('');
          ctx.fillText(part, cx, base);
          cx += ctx.measureText(part).width;
          reveal = 0;
          caret = { x: cx, top };
          break;
        }
        if (reveal <= 0 && !caret) caret = { x: cx, top };
      } else if (mode === 'words') {
        const st = (wi / nWords) * 0.75;
        const e = EASE.outCubic(clamp((p - st) / 0.25));
        ctx.save();
        ctx.globalAlpha *= e;
        ctx.fillText(wd.t, cx, base + (1 - e) * size * 0.35);
        ctx.restore();
        cx += wd.w;
      } else {
        ctx.fillText(wd.t, cx, base);
        cx += wd.w;
      }
      wi++;
    }
    ctx.restore();
    endX = cx;
    endTop = top;
    if (mode === 'typewriter') {
      if (caret) break;
      reveal--;
    }
  }

  if (o.more && (mode !== 'typewriter' || !caret || p >= 1)) {
    ctx.fillStyle = o.moreColor || color;
    ctx.font = rc.font(400, size);
    ctx.fillText('… más', endX + sp, endTop + lh * 0.5 + size * 0.36);
  }
  if (mode === 'typewriter' && p < 1) {
    const c = caret || { x: endX, top: endTop };
    ctx.fillStyle = color;
    ctx.fillRect(c.x + size * 0.06, c.top + lh * 0.18, Math.max(2, size * 0.07), lh * 0.64);
  }
}
