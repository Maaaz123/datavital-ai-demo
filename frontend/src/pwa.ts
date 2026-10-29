import { registerSW } from 'virtual:pwa-register';

/** Bump with every public UI publish so stuck browsers drop old caches. */
const BUILD_ID = 'v50-ipd-chart-scale';
const BUILD_KEY = 'datavital-build-id';

/**
 * Registers the service worker in production only.
 * Caches app shell and static assets — never patient/clinical API payloads.
 * Forces a one-time cache wipe when BUILD_ID changes so GitHub Pages demos update.
 */
export function registerPwaServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  const previous = localStorage.getItem(BUILD_KEY);
  if (previous !== BUILD_ID) {
    localStorage.setItem(BUILD_KEY, BUILD_ID);
    void (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch {
        /* non-fatal */
      }
      if (previous) {
        const url = new URL(window.location.href);
        url.searchParams.set('fresh', BUILD_ID);
        window.location.replace(url.toString());
      }
    })();
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      registration.update().catch(() => {
        /* non-fatal: update check failed */
      });
      window.setInterval(() => {
        registration.update().catch(() => {
          /* non-fatal */
        });
      }, 60_000);
    },
    onRegisterError() {
      /* non-fatal: SW registration failed */
    },
  });
}
