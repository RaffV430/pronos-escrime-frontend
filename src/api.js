import axios from 'axios';

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const rawConfiguredUrl = import.meta.env.VITE_API_URL?.trim();
// Accept legacy values pasted as Markdown links in the hosting settings.
const configuredUrl = rawConfiguredUrl?.match(/^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/)?.[1] || rawConfiguredUrl;
const baseURL = configuredUrl || (isLocal
  ? `http://${window.location.hostname}:5000/api`
  : 'https://pronos-escrime.onrender.com/api');

const API = axios.create({
  baseURL: baseURL.replace(/\/$/, ''),
  timeout: 20000,
  headers: { accept: 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
