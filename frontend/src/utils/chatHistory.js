// Chat history persistence utility
import SecureStorage from './secureStorage';

const STORAGE_PREFIX = 'cookify_';
const CHAT_HISTORY_KEY = 'chat_history';
const CONVERSATION_ID_KEY = 'conversation_id';

/**
 * Get user ID from JWT token
 */
const getUserId = () => {
  try {
    const token = SecureStorage.getToken();
    if (token && typeof token === 'string' && token.split('.').length === 3) {
      const payloadPart = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadPart));
      return decoded?.id || decoded?._id || decoded?.userId || null;
    }
  } catch (e) {
    console.warn('Failed to decode user ID from token:', e);
  }
  return null;
};

/**
 * Generate a storage key for the current user
 */
const getUserStorageKey = (baseKey) => {
  const userId = getUserId();
  return userId ? `${STORAGE_PREFIX}${baseKey}_${userId}` : `${STORAGE_PREFIX}${baseKey}`;
};

/**
 * Save chat messages to localStorage
 */
export const saveChatHistory = (messages) => {
  try {
    const storageKey = getUserStorageKey(CHAT_HISTORY_KEY);
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

/**
 * Load chat messages from localStorage
 */
export const loadChatHistory = () => {
  try {
    const storageKey = getUserStorageKey(CHAT_HISTORY_KEY);
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load chat history:', error);
    return null;
  }
};

/**
 * Clear chat history from localStorage
 */
export const clearChatHistory = () => {
  try {
    const storageKey = getUserStorageKey(CHAT_HISTORY_KEY);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear chat history:', error);
  }
};

/**
 * Save conversation ID to localStorage
 */
export const saveConversationId = (conversationId) => {
  try {
    const storageKey = getUserStorageKey(CONVERSATION_ID_KEY);
    localStorage.setItem(storageKey, conversationId);
  } catch (error) {
    console.warn('Failed to save conversation ID:', error);
  }
};

/**
 * Load conversation ID from localStorage
 */
export const loadConversationId = () => {
  try {
    const storageKey = getUserStorageKey(CONVERSATION_ID_KEY);
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.warn('Failed to load conversation ID:', error);
    return null;
  }
};

/**
 * Clear conversation ID from localStorage
 */
export const clearConversationId = () => {
  try {
    const storageKey = getUserStorageKey(CONVERSATION_ID_KEY);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear conversation ID:', error);
  }
};

/**
 * Clear all chat data (history + conversation ID)
 */
export const clearAllChatData = () => {
  clearChatHistory();
  clearConversationId();
};

/**
 * Check if user has changed (for logout detection)
 */
export const hasUserChanged = (previousUserId) => {
  const currentUserId = getUserId();
  return previousUserId !== currentUserId;
};
