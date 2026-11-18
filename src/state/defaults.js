import { clone } from '../core/utils.js';
import { PRESETS } from '../animation/presets.js';

/**
 * Esquema del proyecto. Todo es serializable a JSON: es lo que se guarda en
 * localStorage, en el JSON exportado y dentro del HTML visor.
 *
 * @typedef {object} ProjectState
 * @property {number} v                 Versión del esquema.
 * @property {'4:5'|'1:1'|'3:4'|'9:16'|'16:9'} format
 * @property {object} author            Cabecera del post (nombre, titular, avatar…).
 * @property {object} post              Texto y modo de ajuste: fit = 'split' | 'auto' | 'manual'.
 * @property {object} media             type = 'none' | 'image' | 'grid' | 'video' | 'document'; items = dataURLs.
 * @property {object} stats             Reacciones, comentarios, botones.
 * @property {object} cover             Portada con los datos del puesto.
 * @property {object} cta               Cierre; mode = 'both' | 'separate' | 'seek' | 'offer'.
 * @property {object} style             Tema, fondo, tipografía, tarjeta y márgenes.
 * @property {object} anim              Preset, ritmo y animación por elemento (el).
 */

export const SCHEMA_VERSION = 1;

/** @type {ProjectState} */
export const DEFAULT_STATE = {
  v: SCHEMA_VERSION,
  format: '4:5',
  author: {
    name: 'Estudio Norte',
    headline: 'Estudio de diseño digital en Madrid',
    time: '2 h',
    globe: true,
    avatar: null,
    shape: 'square',
    initials: 'EN',
    avatarColor: '#2E5E4E',
    follow: true,
  },
  post: {
    text: '¡Seguimos creciendo! 🚀\n\nBuscamos un/a Diseñador/a de Producto Senior que quiera liderar la experiencia de nuestras apps para clientes de retail y cultura.\n\nQué harás:\n→ Diseñar flujos completos, del research al prototipo.\n→ Trabajar codo con codo con desarrollo y negocio.\n→ Definir y mantener nuestro sistema de diseño.\n\nQué buscamos:\n→ 5 años o más diseñando producto digital.\n→ Dominio de Figma y prototipado.\n→ Ganas de explicar el porqué de cada decisión.\n\nOfrecemos modelo híbrido en Madrid, horario flexible y presupuesto anual de formación.\n\n¿Te interesa o conoces a alguien? Escríbenos o comparte este post 👇\n\n#empleo #diseño #UX #producto #Madrid',
    fit: 'split',
    size: 34,
    autoMin: 24,
    autoMax: 46,
    more: false,
    moreLines: 5,
    repeatHeader: true,
    footerEvery: false,
    hashtags: true,
  },
  media: {
    type: 'none',
    aspect: 'auto',
    items: [],
    zoom: 1,
    fx: 0.5,
    fy: 0.5,
    docTitle: 'Descripción del puesto',
    docPage: 0,
    docAuto: true,
    videoTime: 0,
    playIcon: true,
  },
  stats: {
    show: true,
    reactions: 128,
    comments: 14,
    reposts: 6,
    types: ['like', 'love', 'star'],
    actions: true,
    labels: ['Recomendar', 'Comentar', 'Compartir', 'Enviar'],
  },
  cover: {
    on: true,
    layout: 'card',
    image: null,
    overlay: 0.55,
    kicker: 'Estamos contratando',
    role: 'Diseñador/a de Producto Senior',
    company: 'Estudio Norte',
    location: 'Madrid',
    modality: 'Híbrido, 3 días en oficina',
    contract: 'Jornada completa',
    salary: '45.000 – 55.000 € brutos/año',
    showAuthor: true,
    swipe: 'Desliza para ver la oferta',
  },
  cta: {
    on: true,
    mode: 'both',
    handle: '@estudionorte',
    seekTitle: '¿Buscas trabajo?',
    seekText: 'Síguenos y te avisamos de cada nueva oferta que publiquemos.',
    seekBtn: 'Seguir',
    offerTitle: '¿Tienes una vacante?',
    offerText: 'Escríbenos y la compartimos con nuestra comunidad.',
    offerBtn: 'Enviar mensaje',
  },
  style: {
    theme: 'light',
    bgMode: 'theme',
    bg: '#F4F2EE',
    bg2: '#DCE4EE',
    bgImage: null,
    bgDim: 0.2,
    accent: '#0A66C2',
    font: 'system',
    radius: 16,
    shadow: true,
    margin: 64,
    pager: true,
    footerHandle: true,
  },
  anim: {
    preset: 'suave',
    order: 'cascada',
    stagger: 0.16,
    hold: 2.5,
    ease: 'outCubic',
    cps: 45,
    transition: 'deslizar',
    fps: 30,
    el: clone(PRESETS.suave.el),
  },
};

export const createDefaultState = () => clone(DEFAULT_STATE);
