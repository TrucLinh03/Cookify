/**
 * Simple In-Memory Cache for Recommendation System
 * Giảm database load bằng cách cache kết quả gợi ý
 */

class RecommendationCache {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map(); // Time-to-live for each cache entry
  }

  /**
   * Generate cache key
   */
  generateKey(type, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}:${sortedParams}`;
  }

  /**
   * Set cache with TTL (time-to-live in seconds)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    const expiryTime = Date.now() + (ttlSeconds * 1000);
    this.ttlMap.set(key, expiryTime);
    
    // Auto cleanup after TTL
    setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);
  }

  /**
   * Get cached value
   */
  get(key) {
    // Check if expired
    const expiryTime = this.ttlMap.get(key);
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    const validEntries = Array.from(this.ttlMap.entries())
      .filter(([_, expiry]) => expiry > now);
    
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough estimate)
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(value).length * 2;
    }
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
}

// Singleton instance
const recommendationCache = new RecommendationCache();

/**
 * Cache TTL configurations (in seconds)
 */
const CACHE_TTL = {
  POPULAR: 600,        // 10 minutes - Ít thay đổi
  FAVORITES: 600,      // 10 minutes - Ít thay đổi
  LATEST: 120,         // 2 minutes - Thay đổi thường xuyên
  PERSONALIZED: 300,   // 5 minutes - Per user
  STATS: 1800          // 30 minutes - Thống kê
};

/**
 * Middleware to use cache
 */
const withCache = (cacheType, ttl) => {
  return async (req, res, next) => {
    // Generate cache key based on query params
    const cacheKey = recommendationCache.generateKey(cacheType, {
      limit: req.query.limit || 10,
      userId: req.user?.id || 'anonymous'
    });

    // Try to get from cache
    const cachedData = recommendationCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.floor((Date.now() - cachedData.timestamp) / 1000)
      });
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(data) {
      if (data.success) {
        recommendationCache.set(cacheKey, {
          ...data,
          timestamp: Date.now()
        }, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Clear cache for specific type
 */
const clearCache = (type) => {
  if (type) {
    // Clear specific type
    for (const key of recommendationCache.cache.keys()) {
      if (key.startsWith(type + ':')) {
        recommendationCache.delete(key);
      }
    }
  } else {
    // Clear all
    recommendationCache.clear();
  }
};

/**
 * Clear user-specific cache (when user favorites/rates a recipe)
 */
const clearUserCache = (userId) => {
  const userPrefix = `PERSONALIZED:.*userId:${userId}`;
  for (const key of recommendationCache.cache.keys()) {
    if (key.includes(`userId:${userId}`)) {
      recommendationCache.delete(key);
    }
  }
};

module.exports = {
  recommendationCache,
  CACHE_TTL,
  withCache,
  clearCache,
  clearUserCache
};
