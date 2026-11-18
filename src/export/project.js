import { renderSlideToCanvas } from '../render/carousel.js';
import { projectBaseName, saveFile } from '../io/files.js';
import { EMBED_ID, serializeProject } from '../io/project.js';

/** Descarga el proyecto en JSON. */
export function exportProjectJson({ state, notify }) {
  return saveFile(`${projectBaseName(state)}.json`, serializeProject(state), notify);
}

/**
 * Construye el HTML visor: las slides como PNG en un carrusel deslizable, más el
 * proyecto embebido para poder volver a importarlo.
 */
// `<\/script>` va escapado a propósito: este código acaba dentro de un <script> en línea
// (build de un solo archivo) y un "</script>" literal cerraría la etiqueta antes de tiempo.
/* eslint-disable no-useless-escape */
export function buildViewerHtml({ rc, slides }) {
  const { W, H, state } = rc;
  const imgs = slides.map((sl) => renderSlideToCanvas(rc, sl).toDataURL('image/png'));
  const json = JSON.stringify(state).replace(/</g, '\\u003c');
  const title = (state.cover.role || 'Carrusel').replace(/[<&>"]/g, '');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#1E2226;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#E7EAED;padding:24px}
.frame{width:min(92vw,calc(78vh*${W}/${H}));aspect-ratio:${W}/${H};overflow:hidden;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.track::-webkit-scrollbar{display:none}
.track img{flex:0 0 100%;width:100%;height:100%;object-fit:cover;scroll-snap-align:start}
.nav{display:flex;gap:10px;align-items:center}.nav button{border:1px solid rgba(255,255,255,.25);background:none;color:inherit;border-radius:8px;padding:6px 14px;font-size:16px;cursor:pointer}
.dots{display:flex;gap:6px}.dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3)}.dots i.on{background:#fff}
</style></head><body>
<div class="frame"><div class="track" id="t">${imgs.map((s, i) => `<img src="${s}" alt="Slide ${i + 1}">`).join('')}</div></div>
<div class="nav"><button id="p" aria-label="Anterior">‹</button><div class="dots" id="d">${imgs.map(() => '<i></i>').join('')}</div><button id="n" aria-label="Siguiente">›</button></div>
<script type="application/json" id="${EMBED_ID}">${json}<\/script>
<script>const t=document.getElementById('t'),d=[...document.querySelectorAll('#d i')];const idx=()=>Math.round(t.scrollLeft/t.clientWidth);const upd=()=>d.forEach((e,i)=>e.classList.toggle('on',i===idx()));t.addEventListener('scroll',upd);upd();
document.getElementById('p').onclick=()=>t.scrollTo({left:(idx()-1)*t.clientWidth,behavior:'smooth'});document.getElementById('n').onclick=()=>t.scrollTo({left:(idx()+1)*t.clientWidth,behavior:'smooth'});<\/script>
</body></html>`;
}
/* eslint-enable no-useless-escape */

export function exportViewerHtml({ rc, slides, notify }) {
  return saveFile(`${projectBaseName(rc.state)}-carrusel.html`, buildViewerHtml({ rc, slides }), notify);
}
