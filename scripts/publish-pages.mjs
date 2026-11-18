// Copia la build (todo `dist/`) a la raíz del repositorio.
// GitHub Pages sirve la rama `main` tal cual, así que lo que haya en `/index.html` (y el
// manifiesto, el service worker y los iconos de la PWA) es lo que ve la gente.
// El HTML de desarrollo está en src/.
import { cpSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('Falta dist/index.html: ejecuta `vite build` antes.');
  process.exit(1);
}
cpSync(dist, root, { recursive: true });
// Evita que Pages procese el sitio con Jekyll.
writeFileSync(path.join(root, '.nojekyll'), '');
console.log('Publicado en la raíz: index.html, manifest.webmanifest, sw.js, icons/, favicon.svg');
