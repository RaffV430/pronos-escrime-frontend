import axios from 'axios';

// Si on est en local, on tape sur localhost:5000/api
// Sinon, on tape sur ton URL Render en production
const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://pronos-escrime.onrender.com/api';

const API = axios.create({
  baseURL: baseURL,
});

export default API;