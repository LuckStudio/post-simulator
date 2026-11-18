import { clone, getPath, setPath } from '../core/utils.js';

const same = (a, b) => JSON.stringify(a)?.toLowerCase() === JSON.stringify(b)?.toLowerCase();

/**
 * v1 → v2: nuevos valores estándar. Solo se cambian los ajustes que seguían con el valor
 * antiguo por defecto, así un proyecto ya guardado conserva lo que el usuario eligió a mano.
 * [ruta, valor antiguo, valor nuevo]
 */
const V1_TO_V2 = [
  ['author.shape', 'square', 'circle'],
  ['post.fit', 'split', 'auto'],
  ['stats.types', ['like', 'love', 'star'], ['like', 'idea', 'love']],
  ['style.bgMode', 'theme', 'gradient'],
  ['style.bg', '#F4F2EE', '#f2f2f2'],
  ['style.bg2', '#DCE4EE', '#ebedf0'],
  ['anim.order', 'cascada', 'secuencial'],
  ['anim.ease', 'outCubic', 'outExpo'],
];

/**
 * Lleva datos de un proyecto (guardado, importado o de un preset) a la versión actual del
 * esquema. No muta la entrada. Los campos que falten los completa después `hydrate`.
 */
export function migrate(data) {
  const d = clone(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
  if ((Number(d.v) || 1) < 2) {
    const dark = d.style?.theme === 'dark';
    for (const [path, oldValue, newValue] of V1_TO_V2) {
      // El fondo claro nuevo no tiene sentido sobre el tema oscuro.
      if (dark && path.startsWith('style.bg')) continue;
      const cur = getPath(d, path);
      if (cur !== undefined && same(cur, oldValue)) setPath(d, path, newValue);
    }
    const a = d.anim;
    if (a && a.preset === 'suave' && a.order === 'secuencial' && a.ease === 'outExpo' && a.stagger === 0.16) {
      a.preset = 'estandar';
    }
  }
  d.v = 2;
  return d;
}
