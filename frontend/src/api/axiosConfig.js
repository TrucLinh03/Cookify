import axios from 'axios';
import { getApiUrl } from '../config/api.js';
import SecureStorage from '../utils/secureStorage';

const axiosInstance = axios.create({
  baseURL: getApiUrl('/api'),
  withCredentials: true,
  timeout: 30000, // 30s timeout for production
});

// Request interceptor for debugging and auth
axiosInstance.interceptors.request.use(
  (config) => {
    // Auto-add Authorization header if token exists
    const token = SecureStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.status, error.response?.data || error.message);
    }
    
    // Handle 401 Unauthorized - clear storage and redirect to login
    if (error.response?.status === 401) {
      SecureStorage.clearAll();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;