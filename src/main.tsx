import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// PWA Event Trap - Capture before React mounts to eliminate race conditions
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // @ts-expect-error - custom property
  window.deferredPwaPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-captured'));
  console.log('🛠️ [PWA] Install prompt captured and stashed.');
});

// Global Error Boundaries
window.onerror = function (message, source, lineno, colno, error) {
  console.error('🛠️ [Engine QA] Global Error Caught:', { message, source, lineno, colno, error });
  // Prevent white-screening by returning true (optional, but we want to log it safely)
  return false; 
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('🛠️ [Engine QA] Unhandled Promise Rejection:', event.reason);
  // Prevent default handling if necessary
  // event.preventDefault();
});

// PWA Exterminator - REMOVED for Phase 3 implementation
// We are now implementing a native Service Worker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('🛠️ [PWA] Service Worker Active:', reg.scope);
        
        // 1. Update Detection (OTA)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🛠️ [PWA] New content available; please refresh.');
                // @ts-expect-error - custom property stash
                window.pwaUpdateReady = true;
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          }
        });
      },
      (err) => console.error('🛠️ [PWA] Service Worker Registration Failed:', err)
    );
  });
}
