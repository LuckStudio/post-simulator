import { uiAttributes } from '../core/uiSettings.js';

/** Color de la barra del navegador/sistema según la apariencia efectiva. */
const THEME_COLOR = { light: '#0a66c2', dark: '#1e2226' };

/**
 * Aplica los ajustes de la interfaz: atributos `data-*` en <html> y color del sistema.
 * El mismo cálculo lo hace un script en línea de `src/index.html` antes de pintar, para
 * que no haya un parpadeo de tema claro al abrir en oscuro.
 */
export function applyUiSettings(ui, root = document.documentElement) {
  for (const [attr, value] of Object.entries(uiAttributes(ui))) {
    if (value == null) delete root.dataset[attr];
    else root.dataset[attr] = value;
  }
  const dark =
    root.dataset.theme === 'dark' ||
    (!root.dataset.theme && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[dark ? 'dark' : 'light']);
}
