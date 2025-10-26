import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'https://cookify-auiz.onrender.com'}/api`,
  withCredentials: true,
});

export default axiosInstance;