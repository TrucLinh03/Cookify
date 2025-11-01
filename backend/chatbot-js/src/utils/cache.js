/**
 * Simple LRU Cache for chatbot responses and embeddings
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing key
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()).slice(-5) // Last 5 keys for debugging
    };
  }
}

// Create cache instances
const responseCache = new LRUCache(50); // Cache for chat responses
const embeddingCache = new LRUCache(200); // Cache for embeddings
const searchCache = new LRUCache(100); // Cache for search results

// Helper functions
function getCacheKey(query, context = '') {
  // Create a simple hash from query and context
  const str = `${query.toLowerCase().trim()}_${context}`;
  return str.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
}

function getEmbeddingCacheKey(text) {
  return `emb_${text.toLowerCase().trim().substring(0, 100)}`;
}

module.exports = {
  responseCache,
  embeddingCache,
  searchCache,
  getCacheKey,
  getEmbeddingCacheKey,
  LRUCache
};
