/**
 * Recursos que no viven en el estado JSON: imágenes decodificadas y el vídeo subido.
 * Las imágenes se cargan de forma perezosa; cuando una termina de cargar se llama
 * a `onChange` para que la vista vuelva a dibujarse.
 */
export function createAssets(onChange = () => {}) {
  const images = new Map();
  return {
    /** Elemento <video> del post (no se guarda en el proyecto). */
    video: null,

    /** Devuelve la imagen si ya está lista; si no, la empieza a cargar y devuelve null. */
    image(src) {
      if (!src) return null;
      let entry = images.get(src);
      if (!entry) {
        const im = new Image();
        entry = { im, ok: false };
        images.set(src, entry);
        im.onload = () => {
          entry.ok = true;
          onChange();
        };
        im.onerror = () => {};
        im.src = src;
      }
      return entry.ok ? entry.im : null;
    },
  };
}
