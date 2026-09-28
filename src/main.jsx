import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { startMonitoring, reportError } from './lib/monitoring.js';

startMonitoring();

createRoot(document.getElementById('root'), {
  onUncaughtError: (error, info) => reportError(error, { componentStack: info.componentStack }),
  onCaughtError: (error, info) => reportError(error, { componentStack: info.componentStack }),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
