// Genera el material gráfico a partir de la build real (dist/index.html), siempre en modo claro:
//   docs/img/*.png                      capturas del README (a doble resolución)
//   src/public/screenshots/*.png        capturas del manifiesto (ventana de instalación de la PWA)
//   src/public/og-image.jpg             imagen al compartir el enlace (1200×630)
// Uso: npm run build && node scripts/make-screenshots.mjs && npm run build
// (la segunda build copia las imágenes nuevas de src/public a la raíz publicada).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium, devices } = loadPlaywright();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = pathToFileURL(path.join(root, 'dist/index.html')).href;
if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.error('Falta dist/index.html: ejecuta antes `npm run build`.');
  process.exit(1);
}
const DOCS = path.join(root, 'docs/img');
const SHOTS = path.join(root, 'src/public/screenshots');
mkdirSync(DOCS, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

// Preferencias de ejemplo: interfaz clara y algunas tipografías ya usadas/detectadas.
const PREFS = {
  ui: { appearance: 'light', density: 'comfortable', startScreen: 'editor' },
  fontsRecent: ['Montserrat', 'Georgia'],
  fontsInstalled: [
    'Arial',
    'Avenir Next',
    'Georgia',
    'Helvetica Neue',
    'Lato',
    'Montserrat',
    'Playfair Display',
    'Roboto',
    'Times New Roman',
    'Verdana',
  ],
};

// Proyecto de muestra: el de ejemplo (publicación con imagen) más una portada y un cierre, para que
// se vean las tres slides de un carrusel. El resto de valores salen de los estándar de la herramienta.
const SHOWCASE = { v: 3, cover: { on: true }, cta: { on: true } };

const browser = await chromium.launch();

async function openApp({ width = 1440, height = 900, scale = 2 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([prefs, project]) => {
      if (sessionStorage.getItem('preparado')) return;
      sessionStorage.setItem('preparado', '1');
      localStorage.clear();
      indexedDB.deleteDatabase('post-simulator');
      localStorage.setItem('carrusel-ofertas-prefs-v1', JSON.stringify(prefs));
      localStorage.setItem('carrusel-ofertas-v1', JSON.stringify(project));
    },
    [PREFS, SHOWCASE],
  );
  await page.goto(APP);
  await page.waitForTimeout(900);
  return { ctx, page };
}
const shot = async (page, name) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(DOCS, name) });
  console.log('✓ docs/img/' + name);
};
const tab = (page, label) => page.click(`.rail-btn:has-text("${label}")`);

// ---------- Capturas del README ----------
{
  const { ctx, page } = await openApp();
  await page.click('#film button:nth-child(2)'); // la slide del post
  await shot(page, 'editor.png');

  // Menú contextual sobre el post
  await page.click('#film button:nth-child(2)', { button: 'right' });
  await shot(page, 'menu-contextual.png');
  await page.keyboard.press('Escape');

  // Tipografías: la lista desplegada para que se vean los tres grupos
  await tab(page, 'Estilo');
  await page.evaluate(() => {
    const sel = document.getElementById('font-select');
    sel.size = 15;
    sel.style.height = 'auto';
    document.getElementById('font-select').closest('.group').scrollIntoView({ block: 'start' });
  });
  await shot(page, 'tipografias.png');

  // Animación en marcha
  await tab(page, 'Animación');
  await page.click('#modeSeg button[data-mode="anim"]');
  await page.waitForTimeout(1100);
  await shot(page, 'animacion.png');
  await page.click('#modeSeg button[data-mode="static"]');

  // Presets: dos guardados, uno marcado como inicial
  await tab(page, 'Presets');
  for (const name of ['Mi marca · estándar', 'Mi marca · versión oscura']) {
    await page.fill('#preset-name', name);
    await page.click('#panel >> text=Guardar preset');
    await page.waitForTimeout(250);
  }
  await page.click('.preset-card >> nth=0 >> button[aria-label^="Usar al empezar"]');
  await page.evaluate(() => document.querySelector('.preset-list').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(3600); // que desaparezca el aviso
  await shot(page, 'presets.png');

  // Configuración
  await tab(page, 'Configuración');
  await page.evaluate(() => (document.getElementById('panel').scrollTop = 0));
  await shot(page, 'configuracion.png');

  // Exportar
  await tab(page, 'Exportar');
  await shot(page, 'exportar.png');
  await ctx.close();
}

// Pantalla de inicio (escritorio y móvil): varios proyectos de ejemplo, el de la muestra como «Seguir con…»
async function inicio({ name, mobile }) {
  const ctx = await browser.newContext({
    ...(mobile
      ? { ...devices['iPhone 13'], viewport: { width: 390, height: 780 } }
      : { viewport: { width: 1180, height: 760 } }),
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([prefs, project]) => {
      if (sessionStorage.getItem('preparado')) return;
      sessionStorage.setItem('preparado', '1');
      localStorage.clear();
      indexedDB.deleteDatabase('post-simulator');
      localStorage.setItem('carrusel-ofertas-prefs-v1', JSON.stringify({ ...prefs, ui: { appearance: 'light' } }));
      localStorage.setItem('carrusel-ofertas-v1', JSON.stringify(project));
    },
    [PREFS, SHOWCASE],
  );
  await page.goto(APP);
  await page.waitForFunction(() => window.carruselStudio);
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const api = window.carruselStudio.projects;
    const first = api.currentId;
    const variants = [
      ['Cinco consejos', '1:1', true],
      ['Novedades del trimestre', '4:5', false],
    ];
    for (const [name, format, cover] of variants) {
      const st = window.carruselStudio.state;
      st.format = format;
      st.cover.on = cover;
      st.cover.role = name;
      await api.create({ name, state: st });
      await new Promise((r) => setTimeout(r, 300));
    }
    await api.open(first);
  });
  await page.reload();
  await page.waitForSelector('.pc.hero');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(DOCS, name) });
  console.log('✓ docs/img/' + name);
  await ctx.close();
}
await inicio({ name: 'inicio.png', mobile: false });
await inicio({ name: 'inicio-movil.png', mobile: true });

// Móvil
{
  const { ctx, page } = await openApp({ width: 390, height: 844, scale: 3 });
  await shot(page, 'movil.png');
  await ctx.close();
}

// ---------- Slides tal como se exportan ----------
let slides;
{
  const { ctx, page } = await openApp({ scale: 1 });
  slides = await page.evaluate(() => {
    const n = window.carruselStudio.slideCount();
    return Array.from({ length: n }, (_, i) => window.carruselStudio.renderSlide(i).toDataURL('image/png'));
  });
  const labels = ['Portada', 'Post', 'Cierre'];
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1800, height: 820 });
  await p.setContent(`<!doctype html><meta charset="utf-8">
    <body style="margin:0;background:#f4f2ee;font:600 22px 'Instrument Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#5e5e5e">
    <div style="display:flex;gap:48px;justify-content:center;align-items:flex-start;padding:48px 60px">
      ${slides
        .map(
          (src, i) => `<figure style="margin:0;display:flex;flex-direction:column;align-items:center;gap:18px">
            <img src="${src}" style="width:500px;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.14)">
            <figcaption>${i + 1} · ${labels[i] ?? ''}</figcaption></figure>`,
        )
        .join('')}
    </div></body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(DOCS, 'slides.png') });
  console.log('✓ docs/img/slides.png');
  await ctx.close();
}

// ---------- Capturas del manifiesto (tamaño exacto, 1×) ----------
for (const [name, width, height] of [
  ['escritorio.png', 1280, 800],
  ['movil.png', 390, 844],
]) {
  const { ctx, page } = await openApp({ width, height, scale: 1 });
  await page.screenshot({ path: path.join(SHOTS, name) });
  console.log('✓ src/public/screenshots/' + name);
  await ctx.close();
}

// ---------- Imagen para compartir (Open Graph, 1200×630) ----------
{
  const icon = readFileSync(path.join(root, 'src/public/app-icon.svg'), 'utf8');
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const [cover, post, cta] = slides;
  await p.setContent(`<!doctype html><meta charset="utf-8">
  <style>
    body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:'Instrument Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
      background:radial-gradient(1200px 700px at 85% 40%,#dcebfa 0%,#eef3f8 45%,#f4f2ee 100%);color:#1f1f1f}
    .left{position:absolute;left:72px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:22px}
    .brand{display:flex;align-items:center;gap:18px}
    .brand svg{width:84px;height:84px;filter:drop-shadow(0 10px 18px rgba(10,79,158,.25))}
    .brand span{font-size:22px;font-weight:700;color:#0a66c2;letter-spacing:.02em}
    h1{margin:0;font-size:60px;line-height:1.04;letter-spacing:-.02em;font-weight:700}
    p{margin:0;font-size:25px;line-height:1.35;color:#3d4148}
    .chips{display:flex;gap:10px;flex-wrap:wrap}
    .chips b{background:#fff;border:1px solid #d6dde6;border-radius:999px;padding:8px 16px;font-size:18px;font-weight:600;color:#0a4f9e}
    .slide{position:absolute;border-radius:12px;box-shadow:0 24px 60px rgba(15,35,70,.22)}
  </style>
  <div class="left">
    <div class="brand">${icon}<span>POST SIMULATOR</span></div>
    <h1>Simula cómo se verá tu publicación antes de subirla</h1>
    <p>Texto, imágenes, vídeo, documentos y carruseles con estética de post profesional. Expórtalo en imagen o en vídeo animado.</p>
    <div class="chips"><b>Gratis</b><b>Sin registro</b><b>Funciona sin conexión</b></div>
  </div>
  <img class="slide" src="${cta}"   style="left:930px;top:120px;width:300px;transform:rotate(7deg);opacity:.96">
  <img class="slide" src="${post}"  style="left:820px;top:96px;width:320px;transform:rotate(2deg)">
  <img class="slide" src="${cover}" style="left:690px;top:70px;width:360px;transform:rotate(-4deg)">
  `);
  await p.waitForTimeout(400);
  const jpg = await p.screenshot({ type: 'jpeg', quality: 86 });
  writeFileSync(path.join(root, 'src/public/og-image.jpg'), jpg);
  console.log(`✓ src/public/og-image.jpg (${Math.round(jpg.length / 1024)} KB)`);
  await ctx.close();
}

await browser.close();
