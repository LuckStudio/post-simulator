import { clone, getPath, setPath } from '../core/utils.js';
import { DEFAULT_STATE, SCHEMA_VERSION } from './defaults.js';
import { PLACEHOLDER_IMAGE } from './placeholder.js';

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
 * v2 → v3: la herramienta deja de ser solo "ofertas de empleo" y estrena contenido de ejemplo
 * ficticio. Cada texto de ejemplo antiguo que siga sin tocar se sustituye por el nuevo.
 * [ruta, valor antiguo]; el valor nuevo es el de DEFAULT_STATE en esa misma ruta.
 */
export const OLD_DEMO_TEXT =
  '¡Seguimos creciendo! 🚀\n\nBuscamos un/a Diseñador/a de Producto Senior que quiera liderar la experiencia de nuestras apps para clientes de retail y cultura.\n\nQué harás:\n→ Diseñar flujos completos, del research al prototipo.\n→ Trabajar codo con codo con desarrollo y negocio.\n→ Definir y mantener nuestro sistema de diseño.\n\nQué buscamos:\n→ 5 años o más diseñando producto digital.\n→ Dominio de Figma y prototipado.\n→ Ganas de explicar el porqué de cada decisión.\n\nOfrecemos modelo híbrido en Madrid, horario flexible y presupuesto anual de formación.\n\n¿Te interesa o conoces a alguien? Escríbenos o comparte este post 👇\n\n#empleo #diseño #UX #producto #Madrid';
const V2_TO_V3 = [
  ['author.name', 'Estudio Norte'],
  ['author.headline', 'Estudio de diseño digital en Madrid'],
  ['author.initials', 'EN'],
  ['author.avatarColor', '#2E5E4E'],
  ['post.text', OLD_DEMO_TEXT],
  ['media.docTitle', 'Descripción del puesto'],
  ['cover.kicker', 'Estamos contratando'],
  ['cover.role', 'Diseñador/a de Producto Senior'],
  ['cover.company', 'Estudio Norte'],
  ['cover.location', 'Madrid'],
  ['cover.modality', 'Híbrido, 3 días en oficina'],
  ['cover.contract', 'Jornada completa'],
  ['cover.salary', '45.000 – 55.000 € brutos/año'],
  ['cover.swipe', 'Desliza para ver la oferta'],
  ['cta.handle', '@estudionorte'],
  ['cta.seekTitle', '¿Buscas trabajo?'],
  ['cta.seekText', 'Síguenos y te avisamos de cada nueva oferta que publiquemos.'],
  ['cta.offerTitle', '¿Tienes una vacante?'],
  ['cta.offerText', 'Escríbenos y la compartimos con nuestra comunidad.'],
];

/** ¿El proyecto sigue siendo el ejemplo antiguo sin tocar (mismo post y misma portada)? */
const isUntouchedOldDemo = (d) =>
  getPath(d, 'post.text') === OLD_DEMO_TEXT && getPath(d, 'cover.role') === 'Diseñador/a de Producto Senior';

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
  if ((Number(d.v) || 1) < 3) {
    const untouchedDemo = isUntouchedOldDemo(d);
    for (const [path, oldValue] of V2_TO_V3) {
      const cur = getPath(d, path);
      if (cur !== undefined && same(cur, oldValue)) setPath(d, path, getPath(DEFAULT_STATE, path));
    }
    // El ejemplo antiguo sin tocar pasa a ser el nuevo: una publicación libre con imagen,
    // sin portada ni cierre. Un proyecto que el usuario ya ha trabajado conserva sus slides.
    if (untouchedDemo) {
      if (d.cover) d.cover.on = false;
      if (d.cta) d.cta.on = false;
      if (d.media && d.media.type === 'none' && !(d.media.items || []).length) {
        d.media.type = 'image';
        d.media.items = [PLACEHOLDER_IMAGE];
      }
    }
  }
  d.v = SCHEMA_VERSION;
  return d;
}
