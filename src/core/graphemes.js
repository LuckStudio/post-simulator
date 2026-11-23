const segmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/**
 * Divide un texto en «caracteres» tal como se ven: una letra con su acento suelto (o una letra en
 * negrita con su subrayado) cuenta como uno. Sin `Intl.Segmenter` cae a puntos de código.
 * @param {string} text
 * @returns {string[]}
 */
export function splitGraphemes(text) {
  const s = String(text ?? '');
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}
