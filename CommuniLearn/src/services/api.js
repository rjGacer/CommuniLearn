import axios from 'axios';

const raw = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const base = raw ? (raw.endsWith('/api') ? raw : raw + '/api') : '/api';

const api = axios.create({
  baseURL: base,
  withCredentials: true,
});

export default api;
