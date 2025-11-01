import axiosInstance from '../api/axiosConfig';

/**
 * Service để quản lý view history
 */
class ViewHistoryService {
  /**
   * Ghi log khi user xem một recipe
   * @param {string} recipeId - ID của recipe
   * @param {number} duration - Thời gian xem (giây)
   * @param {string} source - Nguồn truy cập (search, recommendation, category, related, direct)
   */
  static async logView(recipeId, duration = 0, source = 'direct') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Không log nếu user chưa đăng nhập
        return null;
      }

      const response = await axiosInstance.post('/view-history/log', {
        recipeId,
        duration,
        source
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error logging view:', error);
      return null;
    }
  }

  /**
   * Lấy lịch sử xem của user
   * @param {number} limit - Số lượng records
   */
  static async getViewHistory(limit = 50) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axiosInstance.get(`/view-history/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching view history:', error);
      throw error;
    }
  }

  /**
   * Lấy category preferences của user
   */
  static async getCategoryPreferences() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axiosInstance.get('/view-history/preferences/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching category preferences:', error);
      throw error;
    }
  }

  /**
   * Lấy view frequency stats
   */
  static async getViewFrequency() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axiosInstance.get('/view-history/frequency', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching view frequency:', error);
      throw error;
    }
  }
}

/**
 * Hook để track view time
 */
export class ViewTimeTracker {
  constructor(recipeId, source = 'direct') {
    this.recipeId = recipeId;
    this.source = source;
    this.startTime = Date.now();
    this.isActive = true;
    this.minViewTime = 3000; // Minimum 3 seconds to count as a view
    
    // Track visibility changes
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Track beforeunload
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  handleBeforeUnload() {
    this.stop();
  }

  pause() {
    if (this.isActive) {
      this.logCurrentView();
      this.isActive = false;
    }
  }

  resume() {
    if (!this.isActive) {
      this.startTime = Date.now();
      this.isActive = true;
    }
  }

  stop() {
    if (this.isActive) {
      this.logCurrentView();
      this.cleanup();
    }
  }

  logCurrentView() {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Only log if user spent meaningful time
    if (duration >= this.minViewTime / 1000) {
      ViewHistoryService.logView(this.recipeId, duration, this.source);
    }
  }

  cleanup() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.isActive = false;
  }
}

export default ViewHistoryService;
