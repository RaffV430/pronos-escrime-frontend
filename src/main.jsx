import { reducedData } from './lib/fieldCache';
import { restoreReadingPosition } from './lib/readingPosition';
import { legacyLoginPath } from './lib/authNavigation';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './components/club-arena.css';
import './components/piste-tokens.css';
import './components/match-board-piste.css';
import './components/admin-layout.css';
import './components/points-boost.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { startMonitoring, reportError } from './lib/monitoring.js';
import { initTheme } from './lib/theme.js';

const loginDestination = legacyLoginPath(location.pathname, location.search, location.hash);
if (loginDestination) history.replaceState(null, '', loginDestination);

initTheme();
if (!reducedData()) import('./brandFonts');
document.documentElement.classList.toggle('reduced-data', reducedData());

document.documentElement.classList.add('club-arena');
startMonitoring();

// Adresse de référence de la page (sans paramètres) : une seule URL par contenu pour les moteurs de recherche.
const canonical = document.querySelector('link[rel="canonical"]');
if (canonical) canonical.href = `https://www.pronos-escrime.fr${location.pathname.replace(/\/+$/, '') || '/'}`;

async function renderApp() {
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
}
renderApp();
restoreReadingPosition();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
