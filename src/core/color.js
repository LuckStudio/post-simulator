const HEX6 = /^#?([0-9a-f]{6})$/i;

/** "#RRGGBB" + alfa → "rgba(...)". Si el color no es válido, usa el azul por defecto. */
export function hexA(hex, a) {
  const m = HEX6.exec(hex || '');
  if (!m) return `rgba(10,102,194,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Luminancia relativa (WCAG) de un color "#RRGGBB", de 0 a 1. */
export function lum(hex) {
  const m = HEX6.exec(hex || '');
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
