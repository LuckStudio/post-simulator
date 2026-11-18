# Notas para trabajar en este repositorio

- Contexto del producto: `docs/CONTEXTO.md`. Arquitectura: `docs/ARCHITECTURE.md`.
- Idioma: interfaz, textos, comentarios y documentación en español.
- Comandos: `npm test`, `npm run lint`, `npm run build` (genera `dist/index.html`, un solo archivo, y lo copia a `/index.html`).
- GitHub Pages sirve `main` tal cual: **`/index.html` es la build publicada, no se edita a mano**; el HTML de desarrollo es `src/index.html`. Tras cualquier cambio de interfaz, ejecuta `npm run build` y sube también `/index.html`.
  Tras tocar algo de `src/render` o `src/animation`, ejecuta también `npm run check:legacy`
  (comparación píxel a píxel con `legacy/`), salvo que el cambio visual sea intencionado.
- Regla de capas: `core`, `state`, `animation` y `render` no tocan el DOM (salvo canvas).
  El render recibe todo por el contexto `rc`; nada de variables globales.
- El estado debe seguir siendo JSON serializable. Campos nuevos → `DEFAULT_STATE`.
- No modificar `legacy/carrusel-ofertas.html`: es la referencia.
- Dependencias externas en runtime: solo JSZip (empaquetado) y pdf.js (cdnjs, bajo demanda).
