/** Tipos de animación disponibles por elemento. */
export const ANIM_TYPES = {
  none: 'Sin animación',
  fade: 'Fundido',
  'slide-up': 'Subir',
  'slide-down': 'Bajar',
  'slide-left': 'Desde la derecha',
  'slide-right': 'Desde la izquierda',
  'zoom-in': 'Acercar',
  'zoom-out': 'Alejar',
  pop: 'Rebote',
  blur: 'Desenfoque',
  wipe: 'Barrido',
  flip: 'Giro',
  typewriter: 'Máquina de escribir',
  words: 'Palabra a palabra',
  lines: 'Línea a línea',
  'count-up': 'Contador',
};

/** Animaciones que solo tienen sentido en elementos de texto. */
export const TEXT_ANIMS = ['typewriter', 'words', 'lines'];
export const isTextAnim = (type) => TEXT_ANIMS.includes(type);

/** Elementos que admiten animaciones de texto. */
export const TEXTUAL = new Set(['text', 'role', 'company', 'meta', 'ctaTitle', 'ctaText']);

/** Elementos animables agrupados por tipo de slide: [grupo, [[clave, etiqueta], ...]]. */
export const EL_GROUPS = [
  [
    'Publicación',
    [
      ['card', 'Tarjeta'],
      ['header', 'Cabecera'],
      ['text', 'Texto'],
      ['media', 'Multimedia'],
      ['stats', 'Reacciones'],
      ['actions', 'Botones'],
    ],
  ],
  [
    'Portada',
    [
      ['coverImage', 'Imagen'],
      ['kicker', 'Etiqueta'],
      ['role', 'Título'],
      ['company', 'Subtítulo'],
      ['meta', 'Detalles'],
      ['coverFooter', 'Pie'],
    ],
  ],
  [
    'Cierre',
    [
      ['ctaIcon', 'Icono'],
      ['ctaTitle', 'Título'],
      ['ctaText', 'Texto'],
      ['ctaButton', 'Botón'],
    ],
  ],
];

export const ELEMENT_KEYS = EL_GROUPS.flatMap(([, els]) => els.map(([k]) => k));

/** Qué tipos de animación se ofrecen para un elemento. */
export function animTypesFor(key) {
  return Object.entries(ANIM_TYPES).filter(([t]) => {
    if (isTextAnim(t)) return TEXTUAL.has(key);
    if (t === 'count-up') return key === 'stats';
    return true;
  });
}

const preset = (map) => {
  const o = {};
  for (const k in map) o[k] = { type: map[k][0], dur: map[k][1] };
  return o;
};

export const PRESETS = {
  /** El punto de partida de la herramienta: como "Suave", pero uno tras otro y de arranque rápido. */
  estandar: {
    label: 'Estándar',
    order: 'secuencial',
    stagger: 0.16,
    ease: 'outExpo',
    el: preset({
      card: ['slide-up', 0.7],
      header: ['fade', 0.5],
      text: ['lines', 1.4],
      media: ['zoom-out', 0.9],
      stats: ['count-up', 1.2],
      actions: ['fade', 0.5],
      coverImage: ['fade', 0.9],
      kicker: ['fade', 0.5],
      role: ['slide-up', 0.7],
      company: ['fade', 0.5],
      meta: ['lines', 0.9],
      coverFooter: ['fade', 0.5],
      ctaIcon: ['pop', 0.6],
      ctaTitle: ['slide-up', 0.6],
      ctaText: ['fade', 0.6],
      ctaButton: ['pop', 0.6],
    }),
  },
  suave: {
    label: 'Suave',
    order: 'cascada',
    stagger: 0.16,
    ease: 'outCubic',
    el: preset({
      card: ['slide-up', 0.7],
      header: ['fade', 0.5],
      text: ['lines', 1.4],
      media: ['zoom-out', 0.9],
      stats: ['count-up', 1.2],
      actions: ['fade', 0.5],
      coverImage: ['fade', 0.9],
      kicker: ['fade', 0.5],
      role: ['slide-up', 0.7],
      company: ['fade', 0.5],
      meta: ['lines', 0.9],
      coverFooter: ['fade', 0.5],
      ctaIcon: ['pop', 0.6],
      ctaTitle: ['slide-up', 0.6],
      ctaText: ['fade', 0.6],
      ctaButton: ['pop', 0.6],
    }),
  },
  redaccion: {
    label: 'Redacción',
    order: 'secuencial',
    stagger: 0.15,
    ease: 'outCubic',
    el: preset({
      card: ['fade', 0.5],
      header: ['slide-right', 0.5],
      text: ['typewriter', 1],
      media: ['wipe', 0.8],
      stats: ['count-up', 1],
      actions: ['slide-up', 0.4],
      coverImage: ['fade', 0.6],
      kicker: ['fade', 0.4],
      role: ['typewriter', 1],
      company: ['fade', 0.4],
      meta: ['lines', 0.8],
      coverFooter: ['fade', 0.4],
      ctaIcon: ['pop', 0.5],
      ctaTitle: ['typewriter', 1],
      ctaText: ['words', 1],
      ctaButton: ['pop', 0.5],
    }),
  },
  dinamico: {
    label: 'Dinámico',
    order: 'cascada',
    stagger: 0.1,
    ease: 'outBack',
    el: preset({
      card: ['pop', 0.6],
      header: ['slide-left', 0.5],
      text: ['words', 1.2],
      media: ['pop', 0.6],
      stats: ['count-up', 0.9],
      actions: ['slide-up', 0.4],
      coverImage: ['zoom-out', 0.8],
      kicker: ['pop', 0.5],
      role: ['words', 0.8],
      company: ['slide-up', 0.5],
      meta: ['lines', 0.7],
      coverFooter: ['slide-up', 0.5],
      ctaIcon: ['pop', 0.5],
      ctaTitle: ['zoom-in', 0.5],
      ctaText: ['slide-up', 0.5],
      ctaButton: ['pop', 0.5],
    }),
  },
  cine: {
    label: 'Cinematográfico',
    order: 'cascada',
    stagger: 0.28,
    ease: 'inOutSine',
    el: preset({
      card: ['blur', 1],
      header: ['blur', 0.8],
      text: ['lines', 1.8],
      media: ['wipe', 1.1],
      stats: ['count-up', 1.4],
      actions: ['fade', 0.8],
      coverImage: ['zoom-out', 1.6],
      kicker: ['blur', 0.8],
      role: ['blur', 1],
      company: ['fade', 0.8],
      meta: ['lines', 1.2],
      coverFooter: ['fade', 0.8],
      ctaIcon: ['blur', 0.8],
      ctaTitle: ['blur', 0.9],
      ctaText: ['fade', 0.9],
      ctaButton: ['flip', 0.8],
    }),
  },
  ninguna: {
    label: 'Sin animación',
    order: 'cascada',
    stagger: 0,
    ease: 'linear',
    el: preset(Object.fromEntries(ELEMENT_KEYS.map((k) => [k, ['none', 0.5]]))),
  },
};
