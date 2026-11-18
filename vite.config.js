import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// El código de la app vive en `src/` (con su propio index.html de desarrollo).
// `npm run build` genera `dist/index.html`, un único archivo autocontenido (JS y CSS
// en línea), y lo copia a la raíz del repositorio para que GitHub Pages lo sirva.
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    root: repoRoot,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
