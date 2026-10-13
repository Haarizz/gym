import axios from 'axios';
import { isTokenExpired, expireSessionAndReload, SESSION_EXPIRED_MESSAGE } from '../utils/session-expiry';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Request interceptor to attach JWT token and Branch ID
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    // BG_98: an expired JWT gets a bare 403 from the backend (not the 401 handled
    // below), so catch it here before the request is sent.
    if (isTokenExpired(token)) {
      expireSessionAndReload();
      return Promise.reject(new Error(SESSION_EXPIRED_MESSAGE));
    }
    const activeBranchId = sessionStorage.getItem('activeBranchId');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeBranchId && activeBranchId !== 'null') {
      config.headers['X-Active-Branch-Id'] = activeBranchId;
    } else {
      // All Branches Mode
      // We remove the blanket frontend block for mutations in All Branches mode.
      // The backend will enforce this via BranchSecurityListener for BranchAware entities.
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized or token expired. Logging out...');

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('roles');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('activeBranchId');
      sessionStorage.removeItem('accessibleBranches');

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
