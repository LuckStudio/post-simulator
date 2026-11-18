export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/**
 * Crea un elemento: h('button', {class:'btn', onclick: fn}, 'Texto', otroNodo).
 * - `class` → className; `onX` con función → addEventListener('x').
 * - `true` → atributo vacío; `false`/null → se omite.
 * - Los hijos pueden ser nodos, texto, arrays (se aplanan) o null/false (se ignoran).
 */
export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
