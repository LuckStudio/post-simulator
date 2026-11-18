/**
 * Imagen de marcador de posición para la publicación de ejemplo: un paisaje abstracto,
 * sin texto ni marcas, generado como SVG. Se guarda como dataURL igual que cualquier imagen
 * subida por el usuario, así que el proyecto de ejemplo funciona sin ningún archivo externo.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4e6f9"/><stop offset="1" stop-color="#8fb9e6"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#cielo)"/>
<circle cx="880" cy="250" r="92" fill="#fff" opacity=".6"/>
<circle cx="880" cy="250" r="150" fill="#fff" opacity=".18"/>
<path d="M0 560C200 480 380 620 600 540S1000 470 1200 540V800H0Z" fill="#6fa0d6" opacity=".6"/>
<path d="M0 660C220 600 420 710 640 650S1040 600 1200 660V800H0Z" fill="#3f78b8" opacity=".8"/>
</svg>`;

export const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(SVG);
