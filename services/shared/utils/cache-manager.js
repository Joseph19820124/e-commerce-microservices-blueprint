const Redis = require('ioredis');
const { promisify } = require('util');
const crypto = require('crypto');

/**
 * Advanced Cache Manager with multiple strategies
 */
class CacheManager {
  constructor(config = {}) {
    this.redis = new Redis({
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.defaultTTL = config.defaultTTL || 3600; // 1 hour
    this.namespace = config.namespace || 'cache';
    this.compression = config.compression || false;
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // Setup error handling
    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.stats.errors++;
    });
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(key) {
    if (typeof key === 'object') {
      key = this.hashObject(key);
    }
    return `${this.namespace}:${key}`;
  }

  /**
   * Hash object for cache key
   */
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Get value from cache
   */
  async get(key, options = {}) {
    try {
      const cacheKey = this.generateKey(key);
      const value = await this.redis.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;

      // Extend TTL on access if specified
      if (options.extendTTL) {
        await this.redis.expire(cacheKey, options.ttl || this.defaultTTL);
      }

      return this.deserialize(value);
    } catch (error) {
      this.stats.errors++;
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    try {
      const cacheKey = this.generateKey(key);
      const serialized = this.serialize(value);
      
      if (ttl || ttl === 0) {
        await this.redis.setex(cacheKey, ttl || this.defaultTTL, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      const cacheKey = this.generateKey(key);
      await this.redis.del(cacheKey);
      this.stats.deletes++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern) {
    try {
      const keys = await this.redis.keys(`${this.namespace}:${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
      }
      return keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Cache-aside pattern implementation
   */
  async cacheAside(key, fetchFunction, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const forceRefresh = options.forceRefresh || false;

    if (!forceRefresh) {
      const cached = await this.get(key, options);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Cache-aside fetch error:', error);
      // Return stale data if available
      if (options.staleIfError) {
        const stale = await this.get(key, { extendTTL: false });
        if (stale !== null) {
          return stale;
        }
      }
      throw error;
    }
  }

  /**
   * Write-through cache pattern
   */
  async writeThrough(key, value, persistFunction, ttl = null) {
    try {
      // Write to persistent storage first
      await persistFunction(value);
      
      // Then update cache
      await this.set(key, value, ttl);
      
      return true;
    } catch (error) {
      console.error('Write-through error:', error);
      // Remove from cache on persistence failure
      await this.delete(key);
      throw error;
    }
  }

  /**
   * Batch get operation
   */
  async mget(keys) {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key));
      const values = await this.redis.mget(...cacheKeys);
      
      const result = {};
      keys.forEach((key, index) => {
        if (values[index] !== null) {
          result[key] = this.deserialize(values[index]);
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Batch set operation
   */
  async mset(keyValuePairs, ttl = null) {
    try {
      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const cacheKey = this.generateKey(key);
        const serialized = this.serialize(value);
        
        if (ttl || ttl === 0) {
          pipeline.setex(cacheKey, ttl || this.defaultTTL, serialized);
        } else {
          pipeline.set(cacheKey, serialized);
        }
      });
      
      await pipeline.exec();
      this.stats.sets += Object.keys(keyValuePairs).length;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Implement cache warming
   */
  async warm(keys, fetchFunction) {
    const missingKeys = [];
    const cached = await this.mget(keys);
    
    keys.forEach(key => {
      if (!cached[key]) {
        missingKeys.push(key);
      }
    });
    
    if (missingKeys.length > 0) {
      const fetchedData = await fetchFunction(missingKeys);
      await this.mset(fetchedData);
    }
    
    return { ...cached, ...fetchedData };
  }

  /**
   * Tagged cache invalidation
   */
  async tag(key, tags) {
    const cacheKey = this.generateKey(key);
    
    for (const tag of tags) {
      await this.redis.sadd(`tag:${tag}`, cacheKey);
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag) {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        this.stats.deletes += keys.length;
      }
      
      return keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error('Tag invalidation error:', error);
      return 0;
    }
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(resource, ttl = 5000) {
    const lockKey = `lock:${resource}`;
    const lockId = crypto.randomUUID();
    
    const result = await this.redis.set(
      lockKey,
      lockId,
      'PX',
      ttl,
      'NX'
    );
    
    if (result === 'OK') {
      return {
        resource,
        lockId,
        release: async () => {
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          
          await this.redis.eval(script, 1, lockKey, lockId);
        }
      };
    }
    
    return null;
  }

  /**
   * Rate limiting implementation
   */
  async checkRateLimit(identifier, limit, window) {
    const key = `rate:${identifier}`;
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zadd(key, now, `${now}-${crypto.randomBytes(4).toString('hex')}`);
    pipeline.zcount(key, '-inf', '+inf');
    pipeline.expire(key, window);
    
    const results = await pipeline.exec();
    const count = results[2][1];
    
    return {
      allowed: count <= limit,
      count,
      remaining: Math.max(0, limit - count),
      resetAt: new Date(now + window * 1000)
    };
  }

  /**
   * Serialize value for storage
   */
  serialize(value) {
    const serialized = JSON.stringify(value);
    
    if (this.compression && serialized.length > 1024) {
      // Implement compression if needed
      return serialized;
    }
    
    return serialized;
  }

  /**
   * Deserialize value from storage
   */
  deserialize(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      total
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Cache strategies
class CacheStrategies {
  /**
   * Time-based cache invalidation
   */
  static timeBased(ttl) {
    return {
      ttl,
      shouldInvalidate: () => false
    };
  }

  /**
   * Event-based cache invalidation
   */
  static eventBased(events) {
    const invalidated = new Set();
    
    return {
      ttl: null,
      shouldInvalidate: (key) => invalidated.has(key),
      invalidate: (key) => invalidated.add(key),
      onEvent: (event, handler) => {
        if (events.includes(event)) {
          handler();
        }
      }
    };
  }

  /**
   * LRU cache strategy
   */
  static lru(maxSize) {
    return {
      maxSize,
      evictionPolicy: 'allkeys-lru'
    };
  }

  /**
   * Write-behind cache strategy
   */
  static writeBehind(batchSize, flushInterval) {
    const buffer = new Map();
    
    return {
      buffer,
      batchSize,
      flushInterval,
      add: (key, value) => {
        buffer.set(key, value);
        if (buffer.size >= batchSize) {
          return true; // Signal to flush
        }
        return false;
      }
    };
  }
}

module.exports = {
  CacheManager,
  CacheStrategies
};