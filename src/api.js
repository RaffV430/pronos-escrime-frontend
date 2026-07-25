import axios from 'axios';

const API = axios.create({
  // On pointe directement vers ton serveur de production Render !
  baseURL: 'https://pronos-escrime.onrender.com/api',
});

export default API;