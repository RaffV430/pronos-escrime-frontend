import axios from 'axios';

const API = axios.create({
  baseURL: 'https://pronos-escrime.onrender.com/api',
});

export default API;