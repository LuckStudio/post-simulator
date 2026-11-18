/**
 * Iconos de la interfaz (rejilla 24×24, solo trazo). Son propios: no reproducen
 * iconos de ninguna marca. Los iconos que se dibujan dentro de las slides están en
 * `render/icons.js`.
 */
export const UI_ICON = {
  brand: 'M7 5h10v14H7zM4 7v10M20 7v10',
  post: 'M5 6h14M12 6v13',
  media: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  cover: 'M3 8h18v12H3zM8.5 8V5h7v3M3 13h18',
  cta: 'M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9zM10 20.5a2.2 2.2 0 0 0 4 0',
  style: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.8.7-1.3 1.5-1.3H17a4 4 0 0 0 4-4c0-5-4-9-9-9z',
  anim: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  export: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  presets: 'M7 4h10v17l-5-4-5 4z',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  prev: 'M15 6l-6 6 6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff:
    'M3 3l18 18M10.6 6.2A9.5 9.5 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.8 9.4 2 12 2 12s4 6 10 6c1.5 0 2.9-.4 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  play: 'M7 5l12 7-12 7z',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  video: 'M4 6h12v12H4zM16 10l5-3v10l-5-3',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M5 12l5 5 9-10',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  plus: 'M12 5v14M5 12h14',
  split: 'M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4',
  text: 'M4 7V5h16v2M12 5v14M9 19h6',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  upload: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  prev2: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
};

const NS = 'http://www.w3.org/2000/svg';

/** Crea un <svg> decorativo (aria-hidden) con el icono `name`. */
export function svgIcon(name, size = 22, stroke = 1.8) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', stroke);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', UI_ICON[name]);
  svg.append(path);
  return svg;
}

/** Sustituye el contenido de los elementos con `data-icon="nombre"` por su icono. */
export function mountStaticIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const size = Number(el.dataset.iconSize) || 22;
    el.replaceChildren(svgIcon(el.dataset.icon, size, el.dataset.icon === 'brand' ? 2 : 1.8));
  });
}
