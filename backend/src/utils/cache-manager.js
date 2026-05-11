/**
 * Cache Manager - In-memory cache with TTL and request deduplication
 * Stores API responses with timestamps to minimize external API calls
 * Prevents duplicate concurrent requests for the same key
 */

class CacheManager {
  constructor(ttlSeconds = 300) {
    this.cache = {};
    this.inFlight = {}; // Track in-flight API requests to prevent duplicates
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Generate cache key from type and identifier
   */
  generateKey(type, identifier) {
    return `${type}:${identifier}`;
  }

  /**
   * Set cache value with optional custom TTL (in seconds)
   */
  set(type, identifier, value, ttlSeconds = null) {
    const key = this.generateKey(type, identifier);
    this.cache[key] = {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds !== null ? ttlSeconds : this.ttlSeconds,
    };
    // Clear in-flight promise after caching
    delete this.inFlight[key];
  }

  /**
   * Get cache value if not expired
   */
  get(type, identifier) {
    const key = this.generateKey(type, identifier);
    if (!this.cache[key]) return null;

    const { value, timestamp, ttl } = this.cache[key];
    const ageSeconds = (Date.now() - timestamp) / 1000;

    if (ageSeconds > ttl) {
      delete this.cache[key];
      return null;
    }

    return value;
  }

  /**
   * Get or store an in-flight promise to prevent duplicate concurrent requests
   */
  getInFlight(type, identifier) {
    return this.inFlight[this.generateKey(type, identifier)];
  }

  /**
   * Set an in-flight promise
   */
  setInFlight(type, identifier, promise) {
    this.inFlight[this.generateKey(type, identifier)] = promise;
  }

  /**
   * Check if cache exists and is valid
   */
  has(type, identifier) {
    return this.get(type, identifier) !== null;
  }

  /**
   * Clear specific cache entry
   */
  clear(type, identifier) {
    const key = this.generateKey(type, identifier);
    delete this.cache[key];
    delete this.inFlight[key];
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache = {};
    this.inFlight = {};
  }

  /**
   * Get cache age in seconds
   */
  getAge(type, identifier) {
    const key = this.generateKey(type, identifier);
    if (!this.cache[key]) return null;

    const { timestamp } = this.cache[key];
    return (Date.now() - timestamp) / 1000;
  }

  /**
   * Debug: Get all cache entries
   */
  getAll() {
    return this.cache;
  }
}

module.exports = new CacheManager(300); // 5-minute TTL
