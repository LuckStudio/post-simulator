// Genera los iconos de la app a partir de un diseño en SVG (definido aquí mismo):
//   src/public/app-icon.svg            icono completo (fuente de los PNG)
//   src/public/favicon.svg             versión simplificada para tamaños pequeños
//   src/public/icons/*.png             PWA (192, 512, maskable), iPhone/iPad y favicon PNG
// Solo hace falta volver a ejecutarlo si cambia el diseño.
// Uso: node scripts/make-icons.mjs   (necesita Playwright; ver README)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
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

const BLUE = '#0a66c2';
const INK = '#1f2a37';

/**
 * Icono en una caja de 512×512.
 * @param {{rounded?:boolean, scale?:number, detail?:boolean}} o
 *   rounded: esquinas redondeadas (false para "maskable", que recorta el sistema);
 *   scale: tamaño del dibujo respecto a la caja (los maskable necesitan margen);
 *   detail: líneas de texto dentro de la tarjeta (no se aprecian en 16–32 px).
 */
export function iconSvg({ rounded = true, scale = 1, detail = true } = {}) {
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`;
  const text = detail
    ? `
    <circle cx="192" cy="166" r="22" fill="${BLUE}"/>
    <rect x="226" y="153" width="104" height="12" rx="6" fill="${BLUE}" opacity=".9"/>
    <rect x="226" y="173" width="64" height="10" rx="5" fill="${BLUE}" opacity=".4"/>
    <rect x="170" y="214" width="172" height="14" rx="7" fill="${INK}" opacity=".88"/>
    <rect x="170" y="240" width="136" height="14" rx="7" fill="${INK}" opacity=".88"/>
    <rect x="170" y="278" width="172" height="10" rx="5" fill="${INK}" opacity=".28"/>
    <rect x="170" y="298" width="118" height="10" rx="5" fill="${INK}" opacity=".28"/>
    <rect x="170" y="332" width="84" height="26" rx="13" fill="${BLUE}"/>`
    : `
    <circle cx="200" cy="176" r="30" fill="${BLUE}"/>
    <rect x="176" y="236" width="160" height="26" rx="13" fill="${INK}" opacity=".85"/>
    <rect x="176" y="284" width="110" height="26" rx="13" fill="${BLUE}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2386e6"/>
      <stop offset="1" stop-color="#0a4f9e"/>
    </linearGradient>
    <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#04264d" flood-opacity=".35"/>
    </filter>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#fondo)"/>
  <g transform="${t}">
    <rect x="66" y="152" width="124" height="196" rx="24" fill="#fff" opacity=".32"/>
    <rect x="322" y="152" width="124" height="196" rx="24" fill="#fff" opacity=".32"/>
    <g filter="url(#sombra)">
      <rect x="144" y="112" width="224" height="276" rx="30" fill="#fff"/>
    </g>${text}
    <circle cx="226" cy="430" r="9" fill="#fff" opacity=".5"/>
    <circle cx="256" cy="430" r="9" fill="#fff"/>
    <circle cx="286" cy="430" r="9" fill="#fff" opacity=".5"/>
  </g>
</svg>
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { chromium } = loadPlaywright();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const pub = path.join(root, 'src/public');
  const out = path.join(pub, 'icons');
  mkdirSync(out, { recursive: true });

  const full = iconSvg();
  const small = iconSvg({ detail: false });
  const maskable = iconSvg({ rounded: false, scale: 0.78 });
  writeFileSync(path.join(pub, 'app-icon.svg'), full);
  writeFileSync(path.join(pub, 'favicon.svg'), small);

  const jobs = [
    ['icon-192.png', 192, full],
    ['icon-512.png', 512, full],
    ['icon-maskable-512.png', 512, maskable],
    ['apple-touch-icon.png', 180, maskable],
    ['favicon-32.png', 32, small],
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
}
