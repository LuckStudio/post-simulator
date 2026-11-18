import { clone } from '../core/utils.js';
import { PRESETS } from '../animation/presets.js';
import { PLACEHOLDER_IMAGE } from './placeholder.js';

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
 * @property {object} cover             Portada opcional: etiqueta, título, subtítulo y detalles.
 * @property {object} cta               Cierre opcional; mode = 'both' | 'separate' | 'seek' (seguir) | 'offer' (contactar).
 * @property {object} style             Tema, fondo, tipografía, tarjeta y márgenes.
 * @property {object} anim              Preset, ritmo y animación por elemento (el).
 */

export const SCHEMA_VERSION = 3;

/** Texto de la publicación de ejemplo: ficticio y sin referencias a nada real. */
export const DEMO_TEXT =
  'Este es un texto de ejemplo para simular cómo se verá tu publicación. Cámbialo por el mensaje que quieras probar.\n\nPuedes añadir #etiquetas y mencionar a @alguien: se colorean como en un post real.';

/** @type {ProjectState} */
export const DEFAULT_STATE = {
  v: SCHEMA_VERSION,
  format: '4:5',
  author: {
    name: 'Nombre de la marca',
    headline: 'Descripción de la cuenta',
    time: '2 h',
    globe: true,
    avatar: null,
    shape: 'circle',
    initials: 'NM',
    avatarColor: '#5B7A99',
    follow: true,
  },
  post: {
    text: DEMO_TEXT,
    fit: 'auto',
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
    type: 'image',
    aspect: 'auto',
    items: [PLACEHOLDER_IMAGE],
    zoom: 1,
    fx: 0.5,
    fy: 0.5,
    docTitle: 'Documento de ejemplo',
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
    types: ['like', 'idea', 'love'],
    actions: true,
    labels: ['Recomendar', 'Comentar', 'Compartir', 'Enviar'],
  },
  cover: {
    on: false,
    layout: 'card',
    image: null,
    overlay: 0.55,
    kicker: 'Etiqueta destacada',
    role: 'Título principal de la publicación',
    company: 'Subtítulo o nombre de la marca',
    location: 'Lugar o enlace de ejemplo',
    modality: 'Formato de ejemplo',
    contract: 'Categoría de ejemplo',
    salary: 'Dato clave de ejemplo',
    showAuthor: true,
    swipe: 'Desliza para ver más',
  },
  cta: {
    on: false,
    mode: 'both',
    handle: '@tumarca',
    seekTitle: '¿Quieres ver más?',
    seekText: 'Síguenos para no perderte las próximas publicaciones.',
    seekBtn: 'Seguir',
    offerTitle: '¿Quieres contactar?',
    offerText: 'Escríbenos y lo hablamos por mensaje directo.',
    offerBtn: 'Enviar mensaje',
  },
  style: {
    theme: 'light',
    bgMode: 'gradient',
    bg: '#f2f2f2',
    bg2: '#ebedf0',
    bgImage: null,
    bgDim: 0.2,
    accent: '#0A66C2',
    font: 'system',
    radius: 16,
    shadow: true,
    shadowBlur: 50,
    margin: 64,
    pager: true,
    footerHandle: true,
  },
  anim: {
    preset: 'estandar',
    order: 'secuencial',
    stagger: 0.16,
    hold: 2.5,
    ease: 'outExpo',
    cps: 45,
    transition: 'deslizar',
    fps: 30,
    // Duración de las slides: 'auto' = animación + pausa; 'fixed' = los segundos indicados.
    duration: { mode: 'auto', seconds: 6 },
    // Slide con vídeo: 'full' = vídeo completo; 'custom' = los segundos indicados; 'auto' = como las demás.
    videoDuration: { mode: 'full', seconds: 10 },
    el: clone(PRESETS.estandar.el),
  },
};

export const createDefaultState = () => clone(DEFAULT_STATE);
