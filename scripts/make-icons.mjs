// Genera los iconos PNG de la PWA a partir de src/public/favicon.svg con Chromium.
// Solo hace falta volver a ejecutarlo si cambia el diseño del icono.
// Uso: node scripts/make-icons.mjs   (necesita Playwright; ver README)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = loadPlaywright();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src/public/icons');
mkdirSync(out, { recursive: true });
const svg = readFileSync(path.join(root, 'src/public/favicon.svg'), 'utf8');

// "maskable": sin esquinas redondeadas y con el símbolo dentro de la zona segura (80 %).
const maskable = svg.replace(' rx="112"', '').replace('scale(14)', 'scale(10.5)');
const jobs = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, maskable],
];

const browser = await chromium.launch();
for (const [name, size, markup] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  );
  writeFileSync(path.join(out, name), await page.screenshot({ omitBackground: true, type: 'png' }));
  await page.close();
  console.log('✓', name);
}
await browser.close();
