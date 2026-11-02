
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
// ============================================================

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

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    // Master login 401 is an expected response when
    // normal company credentials are supplied.
    // The Login page handles the fallback.
    if (status === 401 && url.includes('/master/login')) {
      return Promise.reject(error);
    }

    // Handle real API errors without dumping
    // full AxiosError objects into the console.
    if (status && status !== 401) {
      console.warn(
        `API request failed (${status}):`,
        url,
        error?.response?.data?.message || error.message
      );
    }

    return Promise.reject(error);
  }
);

export default api;
