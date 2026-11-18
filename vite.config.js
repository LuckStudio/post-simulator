import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// El resultado de `npm run build` es un único `dist/index.html` autocontenido
// (JS y CSS en línea), listo para publicarse como artifact o abrirse sin servidor.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
