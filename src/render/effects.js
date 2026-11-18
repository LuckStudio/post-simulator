import { clamp } from '../core/utils.js';
import { EASE } from '../animation/easing.js';

/**
 * Aplica la transformación de entrada de un elemento (opacidad, desplazamiento,
 * escala, recorte o desenfoque) y ejecuta `fn` para dibujarlo.
 * Las animaciones de texto (typewriter, words, lines) las resuelve el propio texto.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./context.js').RenderContext} rc
 * @param {string} type  Tipo de animación (ANIM_TYPES).
 * @param {number} p     Progreso lineal 0..1.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {() => void} fn
 */
export function withAnim(ctx, rc, type, p, box, fn) {
  ctx.save();
  const S = rc.S;
  const e = (EASE[rc.state.anim.ease] || EASE.outCubic)(p);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fadeIn = (v) => {
    ctx.globalAlpha *= clamp(v);
  };
  const scaleAround = (sx, sy) => {
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -cy);
  };

  switch (type) {
    case 'fade':
      fadeIn(EASE.outCubic(p));
      break;
    case 'slide-up':
      fadeIn(p * 2.5);
      ctx.translate(0, (1 - e) * 80 * S);
      break;
    case 'slide-down':
      fadeIn(p * 2.5);
      ctx.translate(0, -(1 - e) * 80 * S);
      break;
    case 'slide-left':
      fadeIn(p * 2.5);
      ctx.translate((1 - e) * 140 * S, 0);
      break;
    case 'slide-right':
      fadeIn(p * 2.5);
      ctx.translate(-(1 - e) * 140 * S, 0);
      break;
    case 'zoom-in': {
      fadeIn(p * 2);
      const k = 0.8 + 0.2 * e;
      scaleAround(k, k);
      break;
    }
    case 'zoom-out': {
      fadeIn(p * 2);
      const k = 1.2 - 0.2 * e;
      scaleAround(k, k);
      break;
    }
    case 'pop': {
      fadeIn(p * 4);
      const k = 0.5 + 0.5 * EASE.outBack(p);
      scaleAround(k, k);
      break;
    }
    case 'flip': {
      fadeIn(p * 3);
      const k = Math.max(0.001, Math.abs(Math.cos(((1 - e) * Math.PI) / 2)));
      scaleAround(1, k);
      break;
    }
    case 'blur':
      fadeIn(EASE.outCubic(p));
      if (1 - e > 0.01) ctx.filter = `blur(${((1 - e) * 26 * S).toFixed(1)}px)`;
      break;
    case 'wipe':
      ctx.beginPath();
      ctx.rect(box.x - 4 * S, box.y - 80 * S, (box.w + 8 * S) * e, box.h + 160 * S);
      ctx.clip();
      break;
    case 'count-up':
      fadeIn(p * 4);
      break;
    default:
      // 'none', 'typewriter', 'words', 'lines': sin transformación de caja.
      break;
  }
  fn();
  ctx.restore();
}
