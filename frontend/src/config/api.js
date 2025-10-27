// Environment detection
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

// Development URLs (local)
const DEV_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  CHATBOT_URL: 'http://localhost:8000',
  RAG_URL: 'http://localhost:8000'
};

// Production URLs (deployed)
const PROD_CONFIG = {
  BASE_URL: 'https://cookify-auiz.onrender.com',
  CHATBOT_URL: 'https://cookify-1-8c21.onrender.com',
  RAG_URL: 'https://cookify-1-8c21.onrender.com'
};

// Smart configuration with fallbacks
export const API_CONFIG = {
  // Main backend API
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (isDevelopment ? DEV_CONFIG.BASE_URL : PROD_CONFIG.BASE_URL),
  
  // Chatbot API
  CHATBOT_URL: import.meta.env.VITE_CHATBOT_API_BASE_URL || (isDevelopment ? DEV_CONFIG.CHATBOT_URL : PROD_CONFIG.CHATBOT_URL),
  
  // RAG API (same as chatbot)
  RAG_URL: import.meta.env.VITE_RAG_API_BASE_URL || (isDevelopment ? DEV_CONFIG.RAG_URL : PROD_CONFIG.RAG_URL),
  
  // Environment info
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: isProduction
};

// Debug logging (only in development)
if (isDevelopment) {
  console.log('🔧 API Configuration:', {
    hostname: window.location.hostname,
    isDevelopment,
    isProduction,
    BASE_URL: API_CONFIG.BASE_URL,
    CHATBOT_URL: API_CONFIG.CHATBOT_URL,
    envVars: {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_CHATBOT_API_BASE_URL: import.meta.env.VITE_CHATBOT_API_BASE_URL,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD
    }
  });
}

// Helper functions
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getChatbotUrl = (endpoint = '') => {
  return `${API_CONFIG.CHATBOT_URL}${endpoint}`;
};

export const getRagUrl = (endpoint = '') => {
  return `${API_CONFIG.RAG_URL}${endpoint}`;
};

// Legacy support
export const getBaseUrl = () => API_CONFIG.BASE_URL;
export default API_CONFIG;
