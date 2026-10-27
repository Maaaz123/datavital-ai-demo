import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker in production only.
 * Caches app shell and static assets — never patient/clinical API payloads.
 */
export function registerPwaServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) {
        registration.update().catch(() => {
          /* non-fatal: update check failed */
        });
      }
    },
    onRegisterError() {
      /* non-fatal: SW registration failed */
    },
  });
}
