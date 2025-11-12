/**
 * Secure Storage Utility
 * Provides safer methods for storing sensitive data
 * Uses localStorage with prefix for persistence
 * Note: This is still client-side storage. For production, consider httpOnly cookies.
 */

const STORAGE_PREFIX = 'cookify_';

class SecureStorage {
  /**
   * Store token (persistent across sessions)
   * Using localStorage instead of sessionStorage to fix login persistence
   */
  static setToken(token) {
    if (!token) return;
    localStorage.setItem(`${STORAGE_PREFIX}token`, token);
  }

  static getToken() {
    return localStorage.getItem(`${STORAGE_PREFIX}token`);
  }

  static removeToken() {
    localStorage.removeItem(`${STORAGE_PREFIX}token`);
    // Also remove old token without prefix (migration)
    localStorage.removeItem('token');
  }

  /**
   * Store user data (non-sensitive info only, persistent)
   */
  static setUser(user) {
    if (!user) return;
    // Only store non-sensitive user info
    const safeUserData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status
    };
    localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(safeUserData));
  }

  static getUser() {
    const userData = localStorage.getItem(`${STORAGE_PREFIX}user`);
    return userData ? JSON.parse(userData) : null;
  }

  static removeUser() {
    localStorage.removeItem(`${STORAGE_PREFIX}user`);
    // Also remove old user without prefix (migration)
    localStorage.removeItem('user');
  }

  /**
   * Store favorites (non-sensitive, can use localStorage)
   */
  static setFavorites(userId, favorites) {
    if (!userId || !Array.isArray(favorites)) return;
    localStorage.setItem(`${STORAGE_PREFIX}favorites_${userId}`, JSON.stringify(favorites));
  }

  static getFavorites(userId) {
    if (!userId) return [];
    const favorites = localStorage.getItem(`${STORAGE_PREFIX}favorites_${userId}`);
    return favorites ? JSON.parse(favorites) : [];
  }

  static removeFavorites(userId) {
    if (!userId) return;
    localStorage.removeItem(`${STORAGE_PREFIX}favorites_${userId}`);
  }

  /**
   * Clear all storage (logout)
   */
  static clearAll() {
    // Clear all cookify_ prefixed items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    // Also clear old items without prefix (migration cleanup)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Migrate old localStorage data to new secure storage
   */
  static migrate() {
    // Migrate token
    const oldToken = localStorage.getItem('token');
    if (oldToken) {
      this.setToken(oldToken);
      localStorage.removeItem('token');
    }

    // Migrate user
    const oldUser = localStorage.getItem('user');
    if (oldUser) {
      try {
        const userData = JSON.parse(oldUser);
        this.setUser(userData);
        localStorage.removeItem('user');
      } catch (e) {
        console.error('Failed to migrate user data');
      }
    }
  }
}

export default SecureStorage;
