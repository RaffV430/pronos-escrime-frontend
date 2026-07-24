import axios from 'axios';

const API = axios.create({
  // En production, il va chercher l'URL Vercel, sinon il bascule sur localhost pour tes tests futurs
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export default function api() { // ou ton export actuel selon ton code
  return API;
}