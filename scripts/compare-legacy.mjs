// Compara, píxel a píxel, lo que dibuja la versión original (legacy/carrusel-ofertas.html)
// con la build actual (dist/index.html) para varios proyectos de prueba.
// Uso: npm run build && npm run check:legacy
//
// Sirve como red de seguridad en refactors: si una variante sale distinta, algo
// ha cambiado en el render. Cuando un cambio visual sea intencionado, este script
// dejará de aplicar a esa variante y conviene sustituirlo por capturas de referencia.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// Playwright no es dependencia del proyecto: se usa el instalado en local o, si no, el global.
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    try {
      return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
    } catch {
      console.error('Necesitas Playwright: npm i -D playwright && npx playwright install chromium');
      process.exit(1);
    }
  }
}
const { chromium } = loadPlaywright();
const { PRESETS } = await import('../src/animation/presets.js');
const { deepMerge } = await import('../src/state/store.js');
const { SCHEMA_VERSION } = await import('../src/state/defaults.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = pathToFileURL(path.join(root, 'legacy/carrusel-ofertas.html')).href;
const CURRENT = pathToFileURL(path.join(root, 'dist/index.html')).href;
const STORAGE_KEY = 'carrusel-ofertas-v1';

if (!fs.existsSync(path.join(root, 'dist/index.html'))) {
  console.error('Falta dist/index.html: ejecuta antes `npm run build`.');
  process.exit(1);
}

const LONG_TEXT = Array.from(
  { length: 9 },
  (_, i) => `Párrafo ${i + 1}: ` + 'texto de relleno con #hashtag y @mención '.repeat(4),
).join('\n\n');

/** Variantes: parches parciales sobre el proyecto por defecto. */
/**
 * Los valores estándar de la herramienta han cambiado a propósito desde la versión original
 * (contenido de ejemplo, avatar redondo, ajuste automático, degradado, sombra de 50 px…). Para
 * comparar el *dibujo* y no los valores por defecto, ambos programas reciben aquí los valores por
 * defecto del propio original (se leen de la página `legacy/`). Con `v` igual a la versión actual
 * del esquema, la migración de la build nueva no los vuelve a cambiar.
 */
let LEGACY_BASE = null;
async function loadLegacyBase(browser) {
  const page = await browser.newPage();
  await page.goto(LEGACY);
  const legacyDefault = await page.evaluate(() => JSON.parse(JSON.stringify(DEFAULT))); // eslint-disable-line no-undef
  await page.close();
  return { ...legacyDefault, v: SCHEMA_VERSION, style: { ...legacyDefault.style, shadowBlur: 44 } };
}

const VARIANTS = {
  'por defecto': {},
  'tema oscuro': { style: { theme: 'dark', accent: '#71B7FB' } },
  'ajuste automático': { post: { fit: 'auto' } },
  'tamaño fijo + más': { post: { fit: 'manual', size: 40, more: true, moreLines: 6 } },
  'texto largo dividido': { post: { text: LONG_TEXT, repeatHeader: false, footerEvery: true } },
  'portada a sangre': { cover: { layout: 'full', overlay: 0.7 } },
  'cierre en dos slides': { cta: { mode: 'separate' } },
  'solo empresas, sin portada': { cover: { on: false }, cta: { mode: 'offer' } },
  '9:16 degradado': { format: '9:16', style: { bgMode: 'gradient', bg: '#123456', bg2: '#89ABCD' } },
  '16:9 sin sombra': { format: '16:9', style: { shadow: false, radius: 0, margin: 100 } },
  '1:1 color avatar círculo': {
    format: '1:1',
    style: { bgMode: 'color', bg: '#FFE9C7' },
    author: { shape: 'circle', follow: false, globe: false },
    stats: { types: ['idea', 'smile'], actions: false },
  },
};

/** Instantes (s) de la animación que se comparan en cada slide. */
const ANIM_TIMES = [0.2, 0.45, 0.8, 1.3, 2.2, 4];

/** Variantes animadas: un proyecto por preset, más uno con ritmo secuencial. */
const ANIM_VARIANTS = Object.fromEntries([
  ...Object.entries(PRESETS).map(([k, p]) => [
    `animación ${p.label}`,
    { anim: { preset: k, order: p.order, stagger: p.stagger, ease: p.ease, el: p.el } },
  ]),
  ['animación secuencial + oscuro', { style: { theme: 'dark' }, anim: { order: 'secuencial', cps: 80 } }],
]);

// Código que se evalúa en cada página para dibujar la slide i en el segundo t.
const RENDER_LEGACY = ([i, t]) => {
  /* global dims, drawSlide, R */
  const { W, H } = dims();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  drawSlide(c.getContext('2d'), R.slides[i], t);
  return c.toDataURL('image/png');
};
const RENDER_CURRENT = ([i, t]) => window.carruselStudio.renderSlide(i, t).toDataURL('image/png');
const COUNT_LEGACY = () => R.slides.length;
const COUNT_CURRENT = () => window.carruselStudio.slideCount();

async function capture(browser, url, patch, { animate = false } = {}) {
  const legacy = url === LEGACY;
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.clock.install();
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.clear();
        indexedDB.deleteDatabase('post-simulator'); // biblioteca de proyectos: empezar siempre limpio
        if (value) localStorage.setItem(key, value);
      } catch {
        /* sin almacenamiento */
      }
    },
    [STORAGE_KEY, JSON.stringify(deepMerge(LEGACY_BASE, patch))],
  );
  await page.goto(url);
  await page.clock.runFor(1000);
  if (!legacy) await page.waitForFunction(() => window.carruselStudio, null, { polling: 'raf' }).catch(() => {});

  const count = await page.evaluate(legacy ? COUNT_LEGACY : COUNT_CURRENT);
  const times = animate ? ANIM_TIMES : [null];
  const frames = [];
  for (let i = 0; i < count; i++) {
    for (const t of times) frames.push(await page.evaluate(legacy ? RENDER_LEGACY : RENDER_CURRENT, [i, t]));
  }
  await page.close();
  return frames;
}

async function diff(browser, a, b) {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ([a, b]) => {
      const load = (src) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: true };
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, c.width, c.height).data;
      };
      const da = px(ia);
      const db = px(ib);
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (
          Math.abs(da[i] - db[i]) > 2 ||
          Math.abs(da[i + 1] - db[i + 1]) > 2 ||
          Math.abs(da[i + 2] - db[i + 2]) > 2 ||
          Math.abs(da[i + 3] - db[i + 3]) > 2
        )
          n++;
      }
      return { n, total: da.length / 4 };
    },
    [a, b],
  );
  await page.close();
  return result;
}

const browser = await chromium.launch();
LEGACY_BASE = await loadLegacyBase(browser);
let failures = 0;

const jobs = [
  ...Object.entries(VARIANTS).map(([name, patch]) => [name, patch, false]),
  ...Object.entries(ANIM_VARIANTS).map(([name, patch]) => [name, patch, true]),
];
for (const [name, patch, animate] of jobs) {
  const [a, b] = await Promise.all([
    capture(browser, LEGACY, patch, { animate }),
    capture(browser, CURRENT, patch, { animate }),
  ]);
  if (a.length !== b.length) {
    console.log(`✗ ${name}: ${a.length} imágenes en el original, ${b.length} en la build`);
    failures++;
    continue;
  }
  const bad = [];
  for (let i = 0; i < a.length; i++) {
    const d = await diff(browser, a[i], b[i]);
    if (d.size || d.n > 0) bad.push(`#${i + 1}: ${d.size ? 'tamaño distinto' : d.n + ' px'}`);
  }
  if (bad.length) {
    failures++;
    console.log(`✗ ${name}: ${bad.join(', ')}`);
  } else console.log(`✓ ${name}: ${a.length} ${animate ? 'fotogramas' : 'slides'} idénticos`);
}

await browser.close();
if (failures) {
  console.log(`\n${failures} variante(s) con diferencias.`);
  process.exit(1);
}
console.log('\nSin diferencias con el original.');
