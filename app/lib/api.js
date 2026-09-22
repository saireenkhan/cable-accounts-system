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

// ============================================================
// REQUEST INTERCEPTOR
// Attach JWT token to every API request
// ============================================================

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// DEBUG VERSION
// ============================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const method = error.config?.method || '';

    console.error('🔴 API ERROR:', {
      status,
      url,
      method,
      response: error.response?.data,
    });

    if (status === 401) {
      console.error('🔴 401 REQUEST:', {
        url,
        method,
      });

      console.error(
        '🔴 RESPONSE:',
        error.response?.data
      );

      console.error(
        '🔴 TOKEN EXISTS:',
        typeof window !== 'undefined'
          ? !!sessionStorage.getItem('token')
          : false
      );

      // IMPORTANT:
      // Do NOT remove the token or redirect here
      // while debugging authentication.
    }

    return Promise.reject(error);
  }
);

export default api;