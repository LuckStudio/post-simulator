# Arquitectura

La herramienta es una aplicación web sin backend. El código fuente está dividido en
módulos ES y Vite lo empaqueta en **un único `dist/index.html`** autocontenido (JS y
CSS en línea), que se publica como artifact o se abre directamente en el navegador.

## Principio central

> **El render es una función de `(estado, recursos)`.**

- **Estado** (`src/state`): un objeto JSON serializable con todo el proyecto. Es lo que
  se guarda en localStorage, se exporta a JSON y va embebido en el HTML visor.
- **Recursos** (`src/render/assets.js`): lo que no cabe en JSON: imágenes
  decodificadas (caché) y el `<video>` subido.
- **Render** (`src/render`): a partir de ambos construye el carrusel (lista de slides con
  sus elementos) y lo dibuja en un canvas a resolución nativa. No lee variables globales:
  todo llega en un **contexto de render** (`rc`).

Esto permite renderizar cualquier proyecto sin tocar la interfaz (exportaciones, tests,
miniaturas, y en el futuro plantillas por cliente o duplicar carruseles).

## Flujo de datos

```
 Panel (ui/panels) ──store.set()──▶ Store (state/store.js) ──subscribe──▶ Preview (ui/preview.js)
        ▲                                   │                                   │
        └──────── rerender del panel ◀──────┘                      buildCarousel(state, assets)
                                            │                                   │
                                     autosave (localStorage)            drawSlide(ctx, rc, slide, t)
```

1. Un control del panel escribe en el store por ruta (`store.set('cover.role', …)`).
2. El store notifica. La vista previa agrupa cambios en un fotograma (`invalidate`),
   reconstruye el carrusel y redibuja; el autoguardado escribe con 500 ms de retardo.
3. Si el cambio afecta a qué opciones se muestran, el panel se repinta (`rebuild: true`).

## Carpetas

| Carpeta             | Responsabilidad                                                                           | ¿Toca el DOM? |
| ------------------- | ----------------------------------------------------------------------------------------- | ------------- |
| `src/core`          | Constantes (formatos, temas, fuentes, reacciones), utilidades, color.                     | No            |
| `src/state`         | Esquema y valores por defecto, store con suscripciones, persistencia.                     | No*           |
| `src/animation`     | Curvas, catálogo de animaciones y presets, cálculo de la línea de tiempo.                 | No            |
| `src/render`        | Contexto de render, maquetado de texto, geometría, slides y dibujo en canvas.             | Solo canvas   |
| `src/render/slides` | Un módulo por tipo de slide: `cover`, `post`, `cta`.                                      | Solo canvas   |
| `src/io`            | Archivos: descargas, lectura de imágenes, PDF (pdf.js bajo demanda), formato de proyecto. | Sí            |
| `src/export`        | PNG/ZIP, vídeo (MediaRecorder), HTML visor y JSON.                                        | Sí            |
| `src/ui`            | Helpers de DOM, campos de formulario, vista previa, avisos y una pestaña por archivo.     | Sí            |
| `src/app.js`        | Composición: crea store, recursos, vista previa y panel; define las acciones.             | Sí            |

\* `persistence.js` usa `localStorage`, que se le puede inyectar.

## Piezas clave

### Contexto de render (`render/context.js`)

```js
rc = { state, assets, W, H, S, theme, font(weight, size), slideCount }
```

`S` es la escala respecto al lado corto de 1080 px: todas las medidas del diseño se
escriben pensando en 1080 y se multiplican por `S`, así el diseño se recoloca solo en
cualquier proporción.

### Construcción del carrusel (`render/carousel.js`)

`buildCarousel(state, assets)` devuelve `{ rc, slides }`. Cada slide es:

```js
{ type: 'cover'|'post'|'cta', label, index, hasMedia, total, items: [SlideItem] }
```

Cada `SlideItem` tiene una `key` de animación (ver `EL_GROUPS`), una caja `box`, hijos
opcionales y una función `draw(ctx, p, type, localT)`. Las tarjetas (`key` que empieza
por `card`) se dibujan solas y recortan a sus hijos.

`drawSlide(ctx, rc, slide, t)` dibuja el fondo, los elementos (con su animación de entrada
en el segundo `t`, o estáticos si `t` es `null`) y el pie.

### Texto largo (`render/layout.js`)

`buildPostPages` reparte el texto según `post.fit`:

- `split`: llena slides línea a línea y, si hay un salto de párrafo cerca del corte, se
  lleva el párrafo entero a la siguiente. La multimedia y las reacciones van en la última
  (o en una slide extra si no caben).
- `auto`: prueba tamaños de `autoMax` a `autoMin` hasta que todo cabe en una slide.
- `manual`: tamaño fijo con "… más" opcional.

### Animación (`animation/`)

`computeTimeline(slide, anim)` asigna a cada elemento `_start`, `_dur` y `_type` según el
orden (cascada o secuencial), la separación y el tipo. `render/effects.js` aplica las
transformaciones de caja (fundido, desplazamiento, escala, recorte, desenfoque…) y
`render/text.js` las animaciones de texto (máquina de escribir, palabra a palabra, línea a línea).

## Cómo añadir…

- **Un campo nuevo al proyecto**: añádelo a `DEFAULT_STATE` (`state/defaults.js`). Los
  proyectos antiguos lo reciben automáticamente al cargar (`hydrate` mezcla con los valores
  por defecto). Si cambia el significado de un campo existente, sube `SCHEMA_VERSION` y
  añade una migración en `hydrate`.
- **Un control en el panel**: usa la fábrica de `ui/fields.js` en la pestaña
  correspondiente de `ui/panels/`.
- **Un tipo de slide**: crea `render/slides/<tipo>.js` que devuelva `{ type, label, hasMedia, items }`
  y añádelo en `buildCarousel`. Si sus elementos se animan, regístralos en `EL_GROUPS` y en
  los `PRESETS`.
- **Una animación**: añádela a `ANIM_TYPES` y su transformación en `render/effects.js`.
- **Una exportación**: un módulo en `src/export/` que reciba `{ rc, slides, notify }` y una
  acción en `app.js`.

## Calidad

- `npm test`: tests unitarios (Vitest) de la lógica pura: store, línea de tiempo,
  maquetado de texto y reparto en slides. En Node se usa un medidor de texto falso
  (`tests/helpers.js`), así el maquetado es determinista.
- `npm run check:legacy`: compara píxel a píxel la build con la versión original
  (`legacy/carrusel-ofertas.html`) en 11 proyectos estáticos y 6 animados. Es la red de
  seguridad para refactors; cuando haya cambios visuales intencionados, conviene sustituirlo
  por capturas de referencia propias.
- `npm run lint` / `npm run format`: ESLint y Prettier.

## API de automatización

`window.carruselStudio` expone `state`, `slideCount()` y `renderSlide(index, t)` para scripts
y pruebas en el navegador. La interfaz no la usa.
