import axios from 'axios';

const API = axios.create({
  // Vercel utilisera sa variable, ton ordi utilisera localhost
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:10000/api', 
});

export default API;