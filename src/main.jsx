import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { startMonitoring, reportError } from './lib/monitoring.js';
import { initTheme } from './lib/theme.js';

initTheme();

startMonitoring();

// Adresse de référence de la page (sans paramètres) : une seule URL par contenu pour les moteurs de recherche.
const canonical = document.querySelector('link[rel="canonical"]');
if (canonical) canonical.href = `https://www.pronos-escrime.fr${location.pathname.replace(/\/+$/, '') || '/'}`;

createRoot(document.getElementById('root'), {
  onUncaughtError: (error, info) => reportError(error, { componentStack: info.componentStack }),
  onCaughtError: (error, info) => reportError(error, { componentStack: info.componentStack }),
}).render(
  <StrictMode>
    <ErrorBoundary zone="application">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
