import { createFieldCache } from './lib/fieldCache';
import { fieldAdapter } from './lib/fieldAdapter';
import axios from 'axios';
import { handleAuthError } from './lib/session.js';
import { observe } from './lib/connectionQuality.js';
import { startOutbox } from './lib/outbox.js';
import { accountScope } from './lib/fieldCache.js';
export { SESSION_EXPIRED_EVENT } from './lib/session.js';

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const rawConfiguredUrl = import.meta.env.VITE_API_URL?.trim();
// Accept legacy values pasted as Markdown links in the hosting settings.
const configuredUrl = rawConfiguredUrl?.match(/^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/)?.[1] || rawConfiguredUrl;
const baseURL =
  configuredUrl ||
  (isLocal ? `http://${window.location.hostname}:5000/api` : 'https://pronos-escrime.onrender.com/api');

const API = axios.create({
  baseURL: baseURL.replace(/\/$/, ''),
  timeout: 20000,
  headers: { accept: 'application/json' },
});

export const consultationCache = createFieldCache(localStorage);
// Chaque échange réel avec le serveur est mesuré : le mode connexion faible s'active tout seul si le réseau
// devient lent ou coupe (et se désactive quand il redevient correct).
const network = axios.getAdapter(API.defaults.adapter);
const timedNetwork = (config) => {
  const start = Date.now();
  return network(config).then(
    (response) => {
      observe(start);
      return response;
    },
    (error) => {
      if (!error.response && error.code !== 'ERR_CANCELED') observe(start, { failed: true });
      throw error;
    },
  );
};
API.defaults.adapter = fieldAdapter(timedNetwork, consultationCache);

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (config.outboxScope && accountScope(token) !== config.outboxScope) {
    throw Object.assign(new Error('Le compte de cet envoi a changé.'), { code: 'ERR_CANCELED' });
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(undefined, (error) => handleAuthError(error));

startOutbox(API);

export default API;
