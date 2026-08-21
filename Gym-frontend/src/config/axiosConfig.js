import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// Request interceptor to attach JWT token and Branch ID
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    const activeBranchId = sessionStorage.getItem('activeBranchId');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (activeBranchId && activeBranchId !== 'null') {
      config.headers['X-Active-Branch-Id'] = activeBranchId;
    } else {
      // We remove the blanket frontend block for mutations in All Branches mode.
      // The backend will enforce this via BranchSecurityListener for BranchAware entities.
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized or token expired. Logging out...");
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('roles');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
