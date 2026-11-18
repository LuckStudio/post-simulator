# Contexto: Estudio de carruseles de ofertas de empleo

## Qué es

Herramienta web (un único HTML) para crear **carruseles de Instagram con estética de post de LinkedIn**, pensada para publicar **ofertas de empleo**. El texto del post se convierte en imagen. También sirve para previsualizar posts antes de publicarlos.

- Artifact publicado: https://claude.ai/artifact/3aHfaHP52uj9Pi2FCmEtu9
- Código fuente: módulos en `src/` (ver `docs/ARCHITECTURE.md`). `npm run build` genera
  `dist/index.html`, un único archivo autocontenido, que es lo que se publica.
- Versión original de un solo archivo: `legacy/carrusel-ofertas.html` (referencia).

## Brief acordado

- **Estructura del carrusel**:
  - **Portada** con el puesto: etiqueta, rol, empresa, ubicación, modalidad, contrato, salario, autor y "desliza".
  - **Post**: una o varias slides.
  - **Cierre** con CTA: "síguenos si buscas trabajo" y "escríbenos si ofreces un puesto". Pueden ir juntos en una slide, en dos slides o solo uno de los dos.
- **Identidad visual**: minimalista, parecida a LinkedIn pero **sin logos ni iconos propietarios**. Iconos y reacciones son diseños propios.
- **Proporciones**: 4:5 (por defecto, 1080×1350), 1:1, 3:4, 9:16 y 16:9. El diseño se recoloca solo.
- **Texto largo**: tres modos a elegir en cada momento:
  - dividir en slides (corta por párrafos);
  - ajuste automático de tamaño;
  - tamaño fijo, con "… más" opcional.
- **Multimedia en el post**: imagen (con zoom y encuadre), cuadrícula de imágenes, vídeo, documento (PDF o imágenes como páginas).
- **Animaciones ricas y elegibles por elemento**:
  - 5 presets: Suave, Redacción, Dinámico, Cinematográfico, Sin animación.
  - 16 tipos: fundido, subir/bajar, desde lados, acercar/alejar, rebote, desenfoque, barrido, giro, máquina de escribir, palabra a palabra, línea a línea, contador.
  - Ajustes: orden en cascada o secuencial, separación, pausa final, curva, velocidad de escritura.
- **Exportación**:
  - PNG por slide o ZIP con todas.
  - Vídeo: uno por slide en ZIP, de una slide, o continuo con transición (deslizar, fundido o corte).
  - HTML visor reimportable.
  - JSON del proyecto.
- **Importación**: JSON o el HTML exportado.

## Decisiones técnicas

- Todo se dibuja en **canvas** a resolución nativa, para que PNG y vídeo salgan idénticos y nítidos.
- **Vídeo**: `MediaRecorder` + `canvas.captureStream`.
  - En Chrome sale MP4 H.264 (probado: 1080×1350). En otros navegadores puede salir WebM.
  - Se graba en tiempo real, así que la pestaña debe estar visible.
- **Librerías**: JSZip (empaquetado en la build, ya no depende de un CDN) para los ZIP;
  pdf.js 3.11.174 (cdnjs, carga bajo demanda) para PDFs.
- **Estado**: un objeto JSON con estas secciones: `format`, `author`, `post`, `media`, `stats`, `cover`, `cta`, `style`, `anim`. Se autoguarda en localStorage.
- **Descargas**: dentro de claude.ai usan la capacidad `downloads` del artifact. Fuera, un enlace de descarga normal.
- **Imágenes**: se guardan como dataURL (redimensionadas a un máximo de 2160 px).

## Historial

- **v0.2 — reestructuración** (sin cambios visuales). Código dividido en módulos con
  Vite; render puro a partir de `(estado, recursos)`; tests unitarios; CI; comparación
  píxel a píxel con la versión original (idéntica en 11 proyectos estáticos y 6 animados).
  Se corrigió un fallo del original: las pestañas **Portada** y **Cierre** mostraban
  `[object HTMLElement]` en lugar de sus campos cuando estaban activadas.

- **v0.3 — interfaz de barra lateral de iconos** (propuesta 8 de las 10 estudiadas).
  Barra de iconos + panel de ajustes + vista previa clara con barra de herramientas
  (proporción, estático/animado, Exportar) y miniaturas; acento azul como en la red social;
  en móvil la barra pasa abajo y el panel queda bajo la vista previa. El render de las slides
  no cambia (sigue idéntico al original). Se corrigió la publicación: GitHub Pages servía
  el HTML de desarrollo y ahora sirve la build de la raíz.

- **v0.4 — estándares, presets y PWA.**
  - Estándar nuevo: avatar en círculo; texto con ajuste automático; contador de reacciones visible con
    Recomendación, Idea y Corazón; fondo en degradado #f2f2f2 → #ebedf0; sombra de 50 px (ajustable);
    animación «uno tras otro» con curva «rápida al inicio» (preset _Estándar_). Los proyectos ya guardados
    se migran sin perder lo que el usuario cambió.
  - Duración configurable de las slides, y de la que lleva vídeo (completo, personalizada o como las demás).
  - Clic derecho en la tira de slides (y en la slide): editar, ocultar/mostrar portada y cierre, modo de texto,
    reacciones, reproducir, descargar PNG/vídeo, copiar imagen. Hueco punteado para recuperar lo oculto.
  - Tipografías: estándar, recientes y todas las instaladas (o escribir el nombre).
  - Presets en localStorage con importar/exportar; PWA instalable y sin conexión; almacenamiento persistente.

## Limitaciones conocidas

- El vídeo subido dentro del post no se guarda en JSON ni en HTML; hay que resubirlo al importar.
- La importación de PDF no se pudo probar en el entorno de desarrollo. Alternativa: subir las páginas como imágenes.
- No hay exportación a GIF.
- Listar _todas_ las fuentes instaladas solo funciona en Chrome/Edge (pide permiso); en otros navegadores
  se detectan las habituales y se puede escribir el nombre de cualquier otra.
- Las fuentes del dispositivo se ven y exportan en este equipo; en otro se sustituyen por la del sistema.
- Un preset con imágenes grandes (avatar, fondo) puede no caber en localStorage (~5 MB): se avisa.

## Próximos pasos propuestos

- Plantillas guardadas por cliente.
- Duplicar un carrusel para otra oferta.
- Portada con foto de equipo.
