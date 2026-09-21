// app/lib/api.js
import axios from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const API_URL = isLocalhost
  ? 'http://localhost:5000/api'
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Auth endpoints return 401 for "wrong credentials" — not "session expired".
    // Don't log the user out for these.
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/verify-password');

    if (status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        const current = window.location.pathname;
        if (current !== '/') {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;