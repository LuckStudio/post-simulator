// Copia la build (dist/index.html) a la raíz del repositorio.
// GitHub Pages está configurado para servir la rama `main` tal cual, así que lo que
// haya en `/index.html` es lo que ve la gente. El HTML de desarrollo está en src/.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = path.join(root, 'dist/index.html');
if (!existsSync(built)) {
  console.error('Falta dist/index.html: ejecuta `vite build` antes.');
  process.exit(1);
}
copyFileSync(built, path.join(root, 'index.html'));
// Evita que Pages procese el sitio con Jekyll.
writeFileSync(path.join(root, '.nojekyll'), '');
console.log('Publicado: index.html (raíz) ← dist/index.html');
