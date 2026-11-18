# Estudio de carruseles de ofertas de empleo

Herramienta web para crear **carruseles de Instagram con estética de post profesional**,
pensada para publicar ofertas de empleo: portada con el puesto, el post en una o varias
slides y un cierre con llamada a la acción. Exporta PNG, vídeo animado, un HTML visor
reimportable y el proyecto en JSON.

El brief, las decisiones y las limitaciones están en [`docs/CONTEXTO.md`](docs/CONTEXTO.md).
La arquitectura del código está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Desarrollo

Requisitos: Node 20 o superior.

```bash
npm install
```

```bash
npm run dev        # servidor de desarrollo con recarga en caliente
```

```bash
npm test           # tests unitarios
```

```bash
npm run lint       # análisis estático
```

## Build

```bash
npm run build
```

Genera **`dist/index.html`**, un único archivo con todo dentro (JS, CSS y JSZip), y lo copia
también a **`/index.html`** (la raíz). GitHub Pages sirve la rama `main` tal cual, así que ese
archivo de la raíz es lo que se ve en la web: **tras cambiar algo, ejecuta `npm run build` y
sube también `index.html`**. Se puede abrir con doble clic o publicar como artifact. Solo hacen falta conexión para las fuentes de
Google y para pdf.js, que se carga bajo demanda al importar un PDF.

### Comprobar que el render no ha cambiado

```bash
npm run build && npm run check:legacy
```

Necesita Playwright con Chromium (`npm i -D playwright && npx playwright install chromium`
si no lo tienes).

## Estructura

```
index.html            build publicada (generada por `npm run build`; no editar a mano)
src/
  index.html          maqueta de la interfaz (HTML de desarrollo)
  main.js             entrada
  app.js              composición y acciones
  core/               constantes y utilidades
  state/              esquema, store y persistencia
  animation/          curvas, presets y línea de tiempo
  render/             maquetado y dibujo en canvas (slides en render/slides/)
  io/                 archivos, imágenes, PDF, formato de proyecto
  export/             PNG/ZIP, vídeo, HTML visor, JSON
  ui/                 vista previa, campos y pestañas del panel
  styles/app.css
tests/                tests unitarios (Vitest)
scripts/              utilidades (comparación con la versión original)
legacy/               versión original de un solo archivo, como referencia
```
