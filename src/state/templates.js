import { hydrate } from './store.js';

/**
 * Plantillas para crear un proyecto nuevo. Cada una es un parche sobre el estado inicial
 * (`patch`): solo lleva lo que cambia respecto a un proyecto vacío. Todo el contenido es
 * ficticio y genérico: es texto de ejemplo para sustituir, no datos de ninguna marca.
 *
 * @typedef {object} Template
 * @property {string} id
 * @property {string} name   nombre del proyecto que se crea
 * @property {string} title  título en la lista
 * @property {string} desc   una línea que explica para qué sirve
 * @property {string} icon   clave de `UI_ICON`
 * @property {object} patch  cambios sobre el estado inicial
 * @property {GuideStep[]} steps  pasos del modo guiado
 */

/**
 * Paso del modo guiado. Un paso es una de tres cosas:
 *  - `fields`: unos pocos campos del proyecto (ruta, etiqueta y tipo);
 *  - `panel`: una sección completa del editor ('media' o 'style');
 *  - `finish`: la pantalla final con las opciones para descargar o compartir.
 * `show` indica qué slide enseñar en la vista previa mientras se rellena el paso.
 *
 * @typedef {object} GuideStep
 * @property {string} id
 * @property {string} title
 * @property {string} hint
 * @property {'cover'|'post'|'cta'} [show]
 * @property {{path:string,label:string,kind?:'text'|'area',rows?:number,ph?:string,rich?:boolean}[]} [fields]
 * @property {'media'|'style'} [panel]
 * @property {boolean} [finish]
 */

const brandStep = {
  id: 'marca',
  title: 'Tu marca',
  hint: 'El nombre y la descripción que aparecen en la cabecera del post.',
  show: 'post',
  fields: [
    { path: 'author.name', label: 'Nombre' },
    { path: 'author.headline', label: 'Descripción de la cuenta' },
    { path: 'author.initials', label: 'Iniciales del avatar' },
  ],
};
const textStep = (hint) => ({
  id: 'texto',
  title: 'Texto',
  hint,
  show: 'post',
  fields: [{ path: 'post.text', label: 'Texto de la publicación', kind: 'area', rows: 8, rich: true }],
});
const mediaStep = {
  id: 'imagen',
  title: 'Imagen',
  hint: 'Añade una imagen, una cuadrícula, un vídeo o un documento. Puedes dejarlo como está.',
  show: 'post',
  panel: 'media',
};
const styleStep = {
  id: 'estilo',
  title: 'Estilo',
  hint: 'Elige el aspecto de las slides: tema, colores y tipografía.',
  show: 'post',
  panel: 'style',
};
const finishStep = {
  id: 'listo',
  title: '¡Listo!',
  hint: 'Revisa el resultado en la vista previa y descárgalo o compártelo.',
  finish: true,
};
const offerStep = (title, hint) => ({
  id: 'cierre',
  title,
  hint,
  show: 'cta',
  fields: [
    { path: 'cta.offerTitle', label: 'Título' },
    { path: 'cta.offerText', label: 'Texto', kind: 'area', rows: 3 },
    { path: 'cta.offerBtn', label: 'Botón' },
    { path: 'cta.handle', label: 'Usuario o cuenta', ph: '@tucuenta' },
  ],
});
const seekStep = (hint) => ({
  id: 'cierre',
  title: 'Cierre',
  hint,
  show: 'cta',
  fields: [
    { path: 'cta.seekTitle', label: 'Título' },
    { path: 'cta.seekText', label: 'Texto', kind: 'area', rows: 3 },
    { path: 'cta.seekBtn', label: 'Botón' },
    { path: 'cta.handle', label: 'Usuario o cuenta', ph: '@tucuenta' },
  ],
});

/** @type {Template[]} */
export const TEMPLATES = [
  {
    id: 'libre',
    name: 'Publicación libre',
    title: 'Publicación libre',
    desc: 'Un post con texto e imagen, para probar lo que quieras.',
    icon: 'post',
    patch: {},
    steps: [
      brandStep,
      textStep('Escribe lo que quieres probar. Los #hashtags y @menciones se colorean como en un post real.'),
      mediaStep,
      styleStep,
      finishStep,
    ],
  },
  {
    id: 'empleo',
    name: 'Oferta de empleo',
    title: 'Oferta de empleo',
    desc: 'Portada con los datos del puesto, el detalle y un cierre para contactar.',
    icon: 'cover',
    patch: {
      post: {
        text: 'Buscamos a una persona para unirse al equipo.\n\nSi te gusta trabajar con calma, aprender rápido y cuidar los detalles, esta oferta es para ti.\n\nCuéntanos quién eres por mensaje. #empleo #equipo',
        fit: 'auto',
      },
      media: { type: 'none', items: [] },
      cover: {
        on: true,
        kicker: 'Estamos contratando',
        role: 'Puesto de ejemplo',
        company: 'Nombre de la empresa',
        location: 'Ciudad o enlace de ejemplo',
        modality: 'Presencial, híbrido o remoto',
        contract: 'Tipo de contrato de ejemplo',
        salary: 'Rango salarial de ejemplo',
        swipe: 'Desliza para ver la oferta',
      },
      cta: {
        on: true,
        mode: 'offer',
        offerTitle: '¿Te interesa?',
        offerText: 'Escríbenos por mensaje directo y te contamos los siguientes pasos.',
        offerBtn: 'Enviar mensaje',
      },
    },
    steps: [
      {
        id: 'puesto',
        title: 'El puesto',
        hint: 'Lo primero que se ve en la portada: qué se busca y quién lo ofrece.',
        show: 'cover',
        fields: [
          { path: 'cover.kicker', label: 'Etiqueta' },
          { path: 'cover.role', label: 'Puesto', kind: 'area', rows: 2 },
          { path: 'cover.company', label: 'Empresa' },
        ],
      },
      {
        id: 'detalles',
        title: 'Los detalles',
        hint: 'Lugar, modalidad, contrato y salario. Deja vacío lo que no quieras mostrar.',
        show: 'cover',
        fields: [
          { path: 'cover.location', label: 'Lugar o enlace' },
          { path: 'cover.modality', label: 'Modalidad' },
          { path: 'cover.contract', label: 'Contrato' },
          { path: 'cover.salary', label: 'Salario' },
        ],
      },
      textStep('Cuenta en qué consiste el puesto y a quién buscas.'),
      brandStep,
      offerStep('Cómo contactar', 'La última slide invita a escribir para postularse.'),
      styleStep,
      finishStep,
    ],
  },
  {
    id: 'evento',
    name: 'Evento',
    title: 'Evento',
    desc: 'Anuncia una charla, taller o encuentro con fecha, lugar y plazas.',
    icon: 'calendar',
    patch: {
      post: {
        text: 'Te invitamos a un encuentro para compartir ideas, resolver dudas y conocernos en persona.\n\nLas plazas son limitadas, así que reserva la tuya cuanto antes. #evento #comunidad',
        fit: 'auto',
      },
      media: { type: 'none', items: [] },
      cover: {
        on: true,
        kicker: 'Evento',
        role: 'Nombre del evento',
        company: 'Organiza: nombre de la marca',
        location: 'Lugar o enlace del evento',
        modality: 'Fecha y hora de ejemplo',
        contract: 'Entrada gratuita o de pago',
        salary: 'Plazas limitadas',
        swipe: 'Desliza para ver el programa',
      },
      cta: {
        on: true,
        mode: 'offer',
        offerTitle: '¿Te apuntas?',
        offerText: 'Reserva tu plaza escribiéndonos por mensaje directo.',
        offerBtn: 'Reservar plaza',
      },
    },
    steps: [
      {
        id: 'evento',
        title: 'El evento',
        hint: 'Lo primero que se ve en la portada: cómo se llama y quién lo organiza.',
        show: 'cover',
        fields: [
          { path: 'cover.kicker', label: 'Etiqueta' },
          { path: 'cover.role', label: 'Nombre del evento', kind: 'area', rows: 2 },
          { path: 'cover.company', label: 'Organiza' },
        ],
      },
      {
        id: 'cuando',
        title: 'Cuándo y dónde',
        hint: 'Fecha, lugar, precio y plazas. Deja vacío lo que no quieras mostrar.',
        show: 'cover',
        fields: [
          { path: 'cover.location', label: 'Lugar o enlace' },
          { path: 'cover.modality', label: 'Fecha y hora' },
          { path: 'cover.contract', label: 'Entrada' },
          { path: 'cover.salary', label: 'Plazas' },
        ],
      },
      textStep('Explica de qué va el evento y por qué merece la pena apuntarse.'),
      brandStep,
      offerStep('Cómo apuntarse', 'La última slide invita a reservar plaza.'),
      styleStep,
      finishStep,
    ],
  },
  {
    id: 'novedad',
    name: 'Novedad o lanzamiento',
    title: 'Novedad o lanzamiento',
    desc: 'Presenta algo nuevo con una imagen destacada y una invitación a seguirte.',
    icon: 'spark',
    patch: {
      post: {
        text: 'Hoy presentamos algo en lo que llevamos tiempo trabajando.\n\nEs más sencillo, más claro y está pensado para ahorrarte tiempo desde el primer día.\n\n¿Qué te parece? Cuéntanoslo en los comentarios. #novedad #lanzamiento',
        fit: 'auto',
      },
      cover: {
        on: false,
      },
      cta: {
        on: true,
        mode: 'seek',
        seekTitle: '¿Quieres saber más?',
        seekText: 'Síguenos para ver las próximas novedades antes que nadie.',
        seekBtn: 'Seguir',
      },
    },
    steps: [
      brandStep,
      textStep('Cuenta qué es lo nuevo, en pocas frases y sin rodeos.'),
      mediaStep,
      seekStep('La última slide invita a seguir la cuenta para ver más novedades.'),
      styleStep,
      finishStep,
    ],
  },
  {
    id: 'guia',
    name: 'Guía en slides',
    title: 'Guía en slides',
    desc: 'Un carrusel para explicar pasos o consejos: el texto se reparte en varias slides.',
    icon: 'list',
    patch: {
      post: {
        text: 'Cómo preparar una publicación clara en cinco pasos\n\n1. Empieza por una idea: cada slide cuenta una sola cosa.\n\n2. Escribe frases cortas. Si dudas, quita una palabra.\n\n3. Elige una imagen que acompañe, no que compita con el texto.\n\n4. Revisa cómo se ve en el móvil antes de publicar.\n\n5. Cierra con una invitación: pregunta, comparte o sigue. #guía #consejos',
        fit: 'split',
        size: 40,
      },
      media: { type: 'none', items: [] },
      cover: {
        on: true,
        kicker: 'Guía rápida',
        role: 'Título de la guía',
        company: 'Nombre de la marca',
        location: '',
        modality: '',
        contract: '',
        salary: '',
        swipe: 'Desliza para empezar',
      },
      cta: {
        on: true,
        mode: 'seek',
        seekTitle: '¿Te ha servido?',
        seekText: 'Guarda la guía y síguenos para recibir la siguiente.',
        seekBtn: 'Seguir',
      },
    },
    steps: [
      {
        id: 'portada',
        title: 'La portada',
        hint: 'El título de la guía y una etiqueta que anticipe de qué trata.',
        show: 'cover',
        fields: [
          { path: 'cover.kicker', label: 'Etiqueta' },
          { path: 'cover.role', label: 'Título de la guía', kind: 'area', rows: 2 },
          { path: 'cover.company', label: 'Subtítulo' },
        ],
      },
      textStep(
        'Escribe un paso o consejo por párrafo, separados por una línea en blanco: cada slide reparte el texto solo.',
      ),
      brandStep,
      seekStep('La última slide invita a guardar la guía y seguir la cuenta.'),
      styleStep,
      finishStep,
    ],
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) ?? null;

/**
 * Estado de un proyecto nuevo a partir de una plantilla: `base` (el estado inicial: valores
 * estándar o el preset marcado como inicial) con el parche de la plantilla encima.
 * Los ajustes de estilo y animación de `base` se respetan: la plantilla solo pone contenido.
 * @param {string} id
 * @param {object} base  estado inicial completo
 */
export function stateFromTemplate(id, base) {
  const t = getTemplate(id);
  if (!t) throw new Error(`Plantilla desconocida: ${id}`);
  // `hydrate` mezcla el parche sobre los valores estándar; se vuelve a aplicar sobre `base`
  // para conservar su estilo (preset inicial) y solo cambiar el contenido.
  const patched = hydrate(JSON.parse(JSON.stringify({ ...mergeOver(base, t.patch) })));
  return patched;
}

/** Mezcla `patch` sobre `base` (objetos clave a clave, arrays y valores se sustituyen). */
function mergeOver(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object'
        ? mergeOver(base[k], v)
        : v;
  }
  return out;
}

/** Número de pasos de una plantilla (0 si no existe). */
export const stepCount = (templateId) => getTemplate(templateId)?.steps.length ?? 0;
