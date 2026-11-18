# Notas para trabajar en este repositorio

- Contexto del producto: `docs/CONTEXTO.md`. Arquitectura: `docs/ARCHITECTURE.md`.
- Idioma: interfaz, textos, comentarios y documentación en español.
- Comandos: `npm test`, `npm run lint`, `npm run build` (genera `dist/index.html`, un solo archivo, y lo copia a `/index.html`).
- GitHub Pages sirve `main` tal cual: **`/index.html` es la build publicada, no se edita a mano**; el HTML de desarrollo es `src/index.html`. Tras cualquier cambio de interfaz, ejecuta `npm run build` y sube también `/index.html`.
  Tras tocar algo de `src/render` o `src/animation`, ejecuta también `npm run check:legacy`
  (comparación píxel a píxel con `legacy/`), salvo que el cambio visual sea intencionado.
- Archivos de la raíz que son build (no se editan a mano): `index.html`, `sw.js`, `manifest.webmanifest`,
  `icons/`, `favicon.svg`. Su fuente está en `src/index.html` y `src/public/`. Los iconos PNG se
  regeneran con `node scripts/make-icons.mjs` (necesita Playwright).
- Si cambia la lista de archivos que guarda `src/public/sw.js`, sube `CACHE` (p. ej. `-v2`).
- Cambiar un valor estándar de `DEFAULT_STATE` que ya estuviera en uso: sube `SCHEMA_VERSION` y añade
  la regla a `src/state/migrate.js` (solo cambia lo que siga con el valor antiguo). `scripts/compare-legacy.mjs`
  fija los valores antiguos en `LEGACY_BASE` para seguir comparando el dibujo.
- Regla de capas: `core`, `state`, `animation` y `render` no tocan el DOM (salvo canvas).
  El render recibe todo por el contexto `rc`; nada de variables globales.
- El estado debe seguir siendo JSON serializable. Campos nuevos → `DEFAULT_STATE`.
- No modificar `legacy/carrusel-ofertas.html`: es la referencia.
- Dependencias externas en runtime: solo JSZip (empaquetado) y pdf.js (cdnjs, bajo demanda).
