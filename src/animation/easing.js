/** Curvas de animación: reciben t ∈ [0,1] y devuelven el progreso. */
export const EASE = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const EASE_LABELS = {
  outCubic: 'Suave',
  outQuint: 'Muy suave',
  outExpo: 'Rápida al inicio',
  inOutSine: 'Cinematográfica',
  outBack: 'Con rebote',
  linear: 'Lineal',
};
