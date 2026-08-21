import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
      // All Branches Mode
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());
      const isGlobalRoute = config.url?.includes('/auth') || config.url?.includes('/branches'); // allow branch operations globally
      
      // Let backend decide on global routes if needed, but for safety we reject standard mutations in All Branches mode
      if (isMutation && !isGlobalRoute) {
        // We reject the request to prevent cross-branch mutation errors
        return Promise.reject(new Error("Please select a specific branch before creating or modifying this record."));
      }
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