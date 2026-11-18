/** Identificadores de la aplicación y de persistencia. */
export const APP_ID = 'carrusel-ofertas';
export const STORAGE_KEY = 'carrusel-ofertas-v1';

/** Proporciones disponibles → tamaño nativo en píxeles [ancho, alto]. */
export const FORMATS = {
  '4:5': [1080, 1350],
  '1:1': [1080, 1080],
  '3:4': [1080, 1440],
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
};

/** Pilas tipográficas que se usan al dibujar en el canvas. */
export const FONTS = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter: 'Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  source: '"Source Sans 3", -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
};

/** Paleta de las slides (no de la interfaz). */
export const THEMES = {
  light: {
    bg: '#F4F2EE',
    card: '#FFFFFF',
    text: 'rgba(0,0,0,0.9)',
    muted: 'rgba(0,0,0,0.6)',
    line: 'rgba(0,0,0,0.12)',
    doc: '#ECEAE6',
  },
  dark: {
    bg: '#000000',
    card: '#1B1F23',
    text: 'rgba(255,255,255,0.9)',
    muted: 'rgba(255,255,255,0.62)',
    line: 'rgba(255,255,255,0.16)',
    doc: '#2A2F35',
  },
};

/** Reacciones propias (color de fondo + etiqueta). Los glifos están en render/icons.js. */
export const REACTIONS = {
  like: { c: '#3D7FE0', l: 'Me gusta' },
  love: { c: '#E5534B', l: 'Corazón' },
  star: { c: '#1F9D63', l: 'Estrella' },
  idea: { c: '#E8A531', l: 'Idea' },
  smile: { c: '#13A8B8', l: 'Sonrisa' },
};

/** Límite de lado largo para las imágenes que se guardan en el proyecto. */
export const MAX_IMAGE_SIDE = 2160;

/** Versión de pdf.js que se carga bajo demanda desde cdnjs. */
export const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
