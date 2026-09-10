// lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Track request count for rate limiting
let requestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 5;
const RESET_INTERVAL = 60000; // 1 minute

// ✅ Add token and rate limit tracking to requests
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ Client-side rate limiting
    const now = Date.now();
    if (now - lastResetTime > RESET_INTERVAL) {
      requestCount = 0;
      lastResetTime = now;
    }

    requestCount++;

    // ✅ If too many requests, add delay
    if (requestCount > MAX_REQUESTS_PER_MINUTE) {
      const waitTime = (requestCount - MAX_REQUESTS_PER_MINUTE) * 1000;
      console.log(`⏳ Rate limit approaching. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Handle response errors with retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Handle 429 (Rate Limit) with retry
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const waitTime = 3000;
      console.log(`⏳ Rate limited. Retrying in ${waitTime/1000}s...`);
      
      // ✅ Show toast notification if available
      try {
        const { default: toast } = await import('react-hot-toast');
        toast.loading(`Rate limited. Retrying...`, { duration: waitTime });
      } catch (e) {
        // Toast not available, just log
        console.log('Rate limited, retrying...');
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return api(originalRequest);
    }

    // ✅ Handle 401 (Unauthorized)
    if (error.response?.status === 401) {
      // Don't redirect on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;