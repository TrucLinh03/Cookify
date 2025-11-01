import axios from 'axios';
import { getApiUrl } from '../config/api.js';

const axiosInstance = axios.create({
  baseURL: getApiUrl('/api'),
  withCredentials: true,
  timeout: 30000, // 30s timeout for production
});

// Request interceptor for debugging and auth
axiosInstance.interceptors.request.use(
  (config) => {
    
    // Auto-add Authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;