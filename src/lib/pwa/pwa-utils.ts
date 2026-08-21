/**
 * Utilitários para detecção de ambiente e capacidades de Progressive Web App (PWA)
 */

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Verificação padrão para navegadores modernos
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Verificação legada para iOS Safari standalone
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // Verificação de TWA (Trusted Web Activity) no Android
  const isAndroidTwa = document.referrer.includes('android-app://');

  return isDisplayStandalone || isIosStandalone || isAndroidTwa;
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('fxios');
  return isSafari;
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // Apenas registrar em ambiente de produção ou se explicitamente suportado
  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[VivaVoz SW] Service Worker registrado com sucesso:', registration.scope);
      return registration;
    })
    .catch((error) => {
      console.warn('[VivaVoz SW] Falha ao registrar Service Worker:', error);
      return null;
    });
}
