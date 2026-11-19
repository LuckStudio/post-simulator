const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha corta en español: «12 nov 2026» (sin año si es del año de `now`). */
export function shortDate(ms, now = Date.now()) {
  const d = new Date(ms);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** «hace un momento», «hace 5 min», «hace 2 h», «ayer», «hace 3 días» o una fecha corta. */
export function timeAgo(ms, now = Date.now()) {
  const diff = Math.max(0, now - ms);
  if (diff < MIN) return 'hace un momento';
  if (diff < HOUR) return `hace ${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `hace ${Math.floor(diff / HOUR)} h`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return shortDate(ms, now);
}
