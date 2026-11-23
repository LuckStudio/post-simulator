/**
 * Formato de texto para publicaciones. LinkedIn no tiene negrita ni cursiva propias en un post:
 * lo que se usa son letras Unicode «matemáticas» (𝗻𝗲𝗴𝗿𝗶𝘁𝗮, 𝘤𝘶𝘳𝘴𝘪𝘷𝘢) y marcas combinadas para subrayar o tachar.
 * Aquí se aplican y se quitan esas letras sobre un texto normal, de modo que lo que se ve en la
 * simulación es exactamente lo que se pega después en LinkedIn.
 *
 * Los acentos y la eñe se conservan: «información» en negrita es la letra en negrita más su acento
 * combinado. Las marcas de subrayado y tachado no existen para emojis.
 */

const A = 65; // 'A'
const a = 97; // 'a'
const D0 = 48; // '0'

/** Inicio de cada alfabeto Unicode (sans-serif): [mayúsculas, minúsculas, dígitos|null]. */
const SETS = {
  bold: [0x1d5d4, 0x1d5ee, 0x1d7ec],
  italic: [0x1d608, 0x1d622, null],
  boldItalic: [0x1d63c, 0x1d656, null],
};

export const UNDERLINE = '̲';
export const STRIKE = '̶';
const COMBINING = /[̀-ͯ]/;

/** Letra formateada → { base, bold, italic }. */
const DECODE = new Map();
for (const [name, [up, low, dig]] of Object.entries(SETS)) {
  const bold = name !== 'italic';
  const italic = name !== 'bold';
  for (let i = 0; i < 26; i++) {
    DECODE.set(String.fromCodePoint(up + i), { base: String.fromCharCode(A + i), bold, italic });
    DECODE.set(String.fromCodePoint(low + i), { base: String.fromCharCode(a + i), bold, italic });
  }
  if (dig != null)
    for (let i = 0; i < 10; i++)
      DECODE.set(String.fromCodePoint(dig + i), { base: String.fromCharCode(D0 + i), bold, italic });
}

const isLetter = (c) => /^[A-Za-z]$/.test(c);
const isDigit = (c) => /^[0-9]$/.test(c);

/** Letra o dígito normal + estilo → su versión Unicode (los demás caracteres quedan igual). */
function encode(base, bold, italic) {
  const key = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : null;
  if (!key) return base;
  const [up, low, dig] = SETS[key];
  if (/[A-Z]/.test(base)) return String.fromCodePoint(up + base.charCodeAt(0) - A);
  if (/[a-z]/.test(base)) return String.fromCodePoint(low + base.charCodeAt(0) - a);
  if (isDigit(base) && dig != null) return String.fromCodePoint(dig + base.charCodeAt(0) - D0);
  return base;
}

/**
 * Texto → «caracteres» con su estilo. Se normaliza a NFD para separar la letra de su acento.
 * @typedef {{base:string, bold:boolean, italic:boolean, under:boolean, strike:boolean, marks:string}} Cell
 * @returns {Cell[]}
 */
function parse(text) {
  const cells = [];
  for (const ch of Array.from(String(text ?? '').normalize('NFD'))) {
    const prev = cells[cells.length - 1];
    if (COMBINING.test(ch) && prev && prev.base !== '\n') {
      if (ch === UNDERLINE) prev.under = true;
      else if (ch === STRIKE) prev.strike = true;
      else prev.marks += ch;
      continue;
    }
    const d = DECODE.get(ch);
    cells.push({ base: d ? d.base : ch, bold: !!d?.bold, italic: !!d?.italic, under: false, strike: false, marks: '' });
  }
  return cells;
}

function serialize(cells) {
  return cells
    .map((c) => {
      const body = encode(c.base, c.bold, c.italic) + c.marks + (c.under ? UNDERLINE : '') + (c.strike ? STRIKE : '');
      // Sin estilo se recompone («o» + acento → «ó»); con estilo se deja la letra con su marca combinada.
      return c.bold || c.italic ? body : body.normalize('NFC');
    })
    .join('');
}

/** Qué caracteres admite cada formato. */
const CAN = {
  bold: (c) => isLetter(c.base) || isDigit(c.base),
  italic: (c) => isLetter(c.base),
  // Subrayado y tachado: cualquier carácter visible salvo saltos de línea y emojis.
  under: (c) => c.base !== '\n' && !/\p{Extended_Pictographic}/u.test(c.base),
  strike: (c) => c.base !== '\n' && !/\p{Extended_Pictographic}/u.test(c.base),
};
export const FORMATS = Object.keys(CAN);

/** Qué formatos tiene aplicados un texto (todos sus caracteres que lo admiten). */
export function describeFormat(text) {
  const cells = parse(text);
  const out = {};
  for (const f of FORMATS) {
    const targets = cells.filter(CAN[f]);
    out[f] = targets.length > 0 && targets.every((c) => c[f]);
  }
  return out;
}

/** Activa el formato en todo el texto o, si ya estaba activo en todo, lo quita. */
export function toggleFormat(text, format) {
  if (!CAN[format]) throw new Error(`Formato desconocido: ${format}`);
  const cells = parse(text);
  const targets = cells.filter(CAN[format]);
  if (!targets.length) return String(text ?? '');
  const on = !targets.every((c) => c[format]);
  for (const c of targets) c[format] = on;
  return serialize(cells);
}

/** Quita todo el formato (negrita, cursiva, subrayado, tachado) y deja el texto normal. */
export function clearFormat(text) {
  const cells = parse(text);
  for (const c of cells) Object.assign(c, { bold: false, italic: false, under: false, strike: false });
  return serialize(cells);
}

/** ¿Lleva el texto algún formato de este módulo? */
export const hasFormat = (text) => {
  const t = String(text ?? '');
  return /[\u{1d5d4}-\u{1d7f5}]/u.test(t) || t.includes(UNDERLINE) || t.includes(STRIKE);
};

// ---------- Listas ----------

const BULLET = '• ';
const NUMBERED = /^\d+\.\s/;

/** Líneas completas que cubren la selección: [inicio, fin) en el texto. */
function lineRange(text, start, end) {
  const from = text.lastIndexOf('\n', Math.max(0, start) - 1) + 1;
  const nl = text.indexOf('\n', Math.max(start, end));
  return [from, nl === -1 ? text.length : nl];
}

/**
 * Convierte las líneas de la selección en una lista con viñetas o numerada, o las deja normales
 * si ya lo eran. Las líneas vacías no se tocan.
 * @param {'bullets'|'numbers'} kind
 * @returns {{ from:number, to:number, replacement:string }} el tramo que cambia y su nuevo texto
 */
export function toggleList(text, start, end, kind) {
  const [from, to] = lineRange(text, start, end);
  const lines = text.slice(from, to).split('\n');
  const content = lines.filter((l) => l.trim());
  const marker = kind === 'bullets' ? (l) => l.startsWith(BULLET) : (l) => NUMBERED.test(l);
  const allOn = content.length > 0 && content.every(marker);
  let n = 0;
  const out = lines.map((l) => {
    if (!l.trim()) return l;
    const bare = l.replace(/^•\s|^\d+\.\s/, ''); // quita la viñeta o el número que tuviera
    if (allOn) return bare;
    return kind === 'bullets' ? BULLET + bare : `${++n}. ${bare}`;
  });
  return { from, to, replacement: out.join('\n') };
}

// ---------- Aplicar sobre una selección ----------

/** Límites de la palabra bajo el cursor (por espacios y saltos de línea) o null si no hay. */
export function wordAt(text, pos) {
  const isSep = (c) => c === ' ' || c === '\n' || c === '\t';
  let s = pos;
  let e = pos;
  while (s > 0 && !isSep(text[s - 1])) s--;
  while (e < text.length && !isSep(text[e])) e++;
  return s === e ? null : [s, e];
}

/**
 * Aplica una operación de formato a la selección de un cuadro de texto.
 * Sin selección, actúa sobre la palabra bajo el cursor (o la línea, si es una lista).
 *
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {'bold'|'italic'|'underline'|'strike'|'clear'|'bullets'|'numbers'} op
 * @returns {{ from:number, to:number, replacement:string, selStart:number, selEnd:number }|null}
 *   el tramo a sustituir, su texto nuevo y la selección que queda; null si no hay nada que cambiar.
 */
export function formatRange(value, start, end, op) {
  if (op === 'bullets' || op === 'numbers') {
    const r = toggleList(value, start, end, op);
    if (r.replacement === value.slice(r.from, r.to)) return null;
    return { ...r, selStart: r.from, selEnd: r.from + r.replacement.length };
  }
  let [s, e] = [Math.min(start, end), Math.max(start, end)];
  if (s === e) {
    const w = wordAt(value, s);
    if (!w) return null;
    [s, e] = w;
  }
  const piece = value.slice(s, e);
  const next = op === 'clear' ? clearFormat(piece) : toggleFormat(piece, op === 'underline' ? 'under' : op);
  if (next === piece) return null;
  return { from: s, to: e, replacement: next, selStart: s, selEnd: s + next.length };
}
