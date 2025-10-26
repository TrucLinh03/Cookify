/**
 * Centralized API Configuration for Production/Development
 */

// Get base URLs from environment variables
export const API_CONFIG = {
  // Main backend API (port 5000)
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://cookify-auiz.onrender.com',
  
  // Chatbot API (port 8000) 
  CHATBOT_URL: import.meta.env.VITE_CHATBOT_API_BASE_URL || 'https://cookify-auiz.onrender.com',
  
  // RAG API (same as chatbot)
  RAG_URL: import.meta.env.VITE_RAG_API_BASE_URL || 'https://cookify-auiz.onrender.com'
};

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
