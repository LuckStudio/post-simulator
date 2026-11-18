/**
 * PWA: service worker (funciona sin conexión), instalación y almacenamiento persistente.
 * Todo es opcional y falla en silencio: la herramienta funciona igual sin ello.
 */

/** Registra el service worker (solo en la versión publicada, nunca en desarrollo). */
export function registerServiceWorker() {
  const ok = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !import.meta.env.DEV;
  if (!ok) return Promise.resolve(null);
  return navigator.serviceWorker.register('./sw.js').catch(() => null);
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Guarda el evento de instalación del navegador para ofrecer un botón "Instalar". */
export function createInstallPrompt(onChange) {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    onChange();
  });
  return {
    canInstall: () => !!deferred && !isStandalone(),
    async install() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      onChange();
      return outcome === 'accepted';
    },
  };
}

/** Pide al navegador que no borre los datos del sitio (presets y proyecto) por falta de espacio. */
export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Estado del almacenamiento: ¿protegido?, ¿sin conexión?, espacio usado. */
export async function storageStatus() {
  let persisted = false;
  let usage = null;
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? false;
    usage = (await navigator.storage?.estimate?.())?.usage ?? null;
  } catch {
    /* sin API de almacenamiento */
  }
  let offlineReady = false;
  try {
    const keys = (await window.caches?.keys?.()) ?? [];
    offlineReady = keys.some((k) => k.startsWith('estudio-carruseles-'));
  } catch {
    /* idem */
  }
  return { persisted, usage, offlineReady, standalone: isStandalone() };
}
