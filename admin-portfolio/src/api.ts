import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers['x-admin-token'] = token;
  }
  return config;
});

// If any admin API returns 401, clear the token and force re-login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/admin/login') {
      localStorage.removeItem('adminToken');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
