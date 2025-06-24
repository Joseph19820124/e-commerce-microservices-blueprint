# Comprehensive Caching Strategy

## Overview

This document outlines the multi-layer caching strategy for the e-commerce microservices platform, designed to improve performance, reduce database load, and enhance user experience.

## Cache Layers

### 1. Browser Cache
- Static assets (CSS, JS, images)
- Service Worker for offline functionality
- LocalStorage for user preferences

### 2. CDN Cache (CloudFlare/CloudFront)
- Static content distribution
- Edge caching for API responses
- Geographic distribution

### 3. Nginx Cache
- Reverse proxy cache
- Static file serving
- Response caching

### 4. Application Cache (Redis)
- Session storage
- API response cache
- Database query cache
- Real-time data

### 5. Database Cache
- Query result cache
- Prepared statement cache
- Connection pooling

## Implementation by Service

### Product Catalog Service

```javascript
// Product caching strategy
const productCache = {
  // Individual product cache - 1 hour
  singleProduct: {
    keyPattern: 'product:{productId}',
    ttl: 3600,
    tags: ['product', 'catalog']
  },
  
  // Category products - 30 minutes
  categoryProducts: {
    keyPattern: 'category:{categoryId}:products:{page}:{sort}',
    ttl: 1800,
    tags: ['category', 'product-list']
  },
  
  // Search results - 15 minutes
  searchResults: {
    keyPattern: 'search:{queryHash}:{filters}:{page}',
    ttl: 900,
    tags: ['search']
  },
  
  // Popular products - 2 hours
  popularProducts: {
    keyPattern: 'popular:products:{timeframe}',
    ttl: 7200,
    tags: ['popular', 'homepage']
  },
  
  // Product inventory - 5 minutes
  inventory: {
    keyPattern: 'inventory:{productId}',
    ttl: 300,
    tags: ['inventory']
  }
};

// Implementation example
async function getProduct(productId) {
  const cacheKey = `product:${productId}`;
  
  return await cacheManager.cacheAside(
    cacheKey,
    async () => {
      const product = await Product.findById(productId);
      if (!product) throw new NotFoundError('Product not found');
      
      // Warm related caches
      await cacheManager.set(
        `inventory:${productId}`,
        product.inventory,
        300
      );
      
      return product;
    },
    {
      ttl: 3600,
      tags: ['product', `product:${productId}`]
    }
  );
}
```

### Shopping Cart Service

```javascript
// Cart caching strategy
const cartCache = {
  // User cart - 1 hour sliding window
  userCart: {
    keyPattern: 'cart:{userId}',
    ttl: 3600,
    sliding: true
  },
  
  // Cart calculations - 5 minutes
  cartTotals: {
    keyPattern: 'cart:{userId}:totals',
    ttl: 300,
    tags: ['cart-totals']
  },
  
  // Shipping rates - 30 minutes
  shippingRates: {
    keyPattern: 'shipping:{zipCode}:{weight}',
    ttl: 1800,
    tags: ['shipping']
  }
};

// Session-based cart with Redis
class CartService {
  async getCart(userId) {
    const cart = await cacheManager.get(`cart:${userId}`);
    
    if (!cart) {
      // Initialize empty cart
      const newCart = {
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await cacheManager.set(
        `cart:${userId}`,
        newCart,
        3600
      );
      
      return newCart;
    }
    
    // Extend TTL on access
    await cacheManager.expire(`cart:${userId}`, 3600);
    
    return cart;
  }
  
  async addToCart(userId, productId, quantity) {
    const lock = await cacheManager.acquireLock(`cart:${userId}:lock`, 5000);
    
    if (!lock) {
      throw new Error('Cart is being updated');
    }
    
    try {
      const cart = await this.getCart(userId);
      
      // Update cart logic
      const existingItem = cart.items.find(item => item.productId === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
      
      cart.updatedAt = new Date();
      
      // Save to cache
      await cacheManager.set(`cart:${userId}`, cart, 3600);
      
      // Invalidate totals
      await cacheManager.delete(`cart:${userId}:totals`);
      
      return cart;
    } finally {
      await lock.release();
    }
  }
}
```

### User Profile Service

```javascript
// User caching strategy
const userCache = {
  // User profile - 30 minutes
  profile: {
    keyPattern: 'user:{userId}:profile',
    ttl: 1800,
    tags: ['user-profile']
  },
  
  // User sessions - 24 hours
  session: {
    keyPattern: 'session:{sessionId}',
    ttl: 86400,
    tags: ['session']
  },
  
  // User permissions - 1 hour
  permissions: {
    keyPattern: 'user:{userId}:permissions',
    ttl: 3600,
    tags: ['permissions']
  },
  
  // Authentication tokens - 15 minutes
  authToken: {
    keyPattern: 'auth:token:{token}',
    ttl: 900,
    tags: ['auth']
  }
};

// Session management
class SessionManager {
  async createSession(userId, metadata) {
    const sessionId = crypto.randomUUID();
    const session = {
      sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata
    };
    
    await cacheManager.set(
      `session:${sessionId}`,
      session,
      86400 // 24 hours
    );
    
    // Track active sessions
    await cacheManager.sadd(
      `user:${userId}:sessions`,
      sessionId
    );
    
    return session;
  }
  
  async validateSession(sessionId) {
    const session = await cacheManager.get(`session:${sessionId}`);
    
    if (!session) {
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    await cacheManager.set(
      `session:${sessionId}`,
      session,
      86400,
      { extendTTL: true }
    );
    
    return session;
  }
}
```

### Search Service

```javascript
// Search caching with intelligent invalidation
class SearchCache {
  constructor(cacheManager) {
    this.cache = cacheManager;
    this.searchTTL = 900; // 15 minutes
  }
  
  async cacheSearchResults(query, filters, results) {
    const cacheKey = this.generateSearchKey(query, filters);
    
    // Cache the results
    await this.cache.set(cacheKey, {
      query,
      filters,
      results,
      timestamp: Date.now()
    }, this.searchTTL);
    
    // Track search patterns
    await this.trackSearchPattern(query, filters);
  }
  
  generateSearchKey(query, filters) {
    const normalizedQuery = query.toLowerCase().trim();
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join(':');
    
    return `search:${crypto
      .createHash('md5')
      .update(`${normalizedQuery}:${sortedFilters}`)
      .digest('hex')}`;
  }
  
  async trackSearchPattern(query, filters) {
    const hour = new Date().getHours();
    const key = `search:patterns:${hour}`;
    
    await this.cache.zincrby(
      key,
      1,
      JSON.stringify({ query, filters })
    );
    
    // Expire after 24 hours
    await this.cache.expire(key, 86400);
  }
  
  async getPopularSearches(limit = 10) {
    const hour = new Date().getHours();
    const patterns = [];
    
    // Get patterns from last 24 hours
    for (let i = 0; i < 24; i++) {
      const h = (hour - i + 24) % 24;
      const results = await this.cache.zrevrange(
        `search:patterns:${h}`,
        0,
        limit - 1,
        'WITHSCORES'
      );
      
      patterns.push(...results);
    }
    
    // Aggregate and sort
    return this.aggregatePatterns(patterns).slice(0, limit);
  }
}
```

## Cache Invalidation Strategies

### 1. Time-Based Invalidation (TTL)
```javascript
// Simple TTL-based cache
await cache.set('key', value, 3600); // 1 hour TTL
```

### 2. Event-Based Invalidation
```javascript
// Event-driven cache invalidation
eventEmitter.on('product.updated', async (productId) => {
  await cache.delete(`product:${productId}`);
  await cache.invalidateTag(`category:${product.categoryId}`);
  await cache.deletePattern(`search:*`);
});

eventEmitter.on('inventory.changed', async (productId) => {
  await cache.delete(`inventory:${productId}`);
  await cache.delete(`product:${productId}`);
});
```

### 3. Tag-Based Invalidation
```javascript
// Tag products by category
await cache.set('product:123', product, 3600);
await cache.tag('product:123', ['category:electronics', 'brand:apple']);

// Invalidate all electronics
await cache.invalidateTag('category:electronics');
```

### 4. Dependency-Based Invalidation
```javascript
// Track dependencies
const dependencies = {
  'user:profile': ['user:sessions', 'user:permissions'],
  'product:list': ['product:*', 'category:*'],
  'cart:totals': ['cart:items', 'product:prices']
};

async function invalidateWithDependencies(key) {
  await cache.delete(key);
  
  const deps = dependencies[key] || [];
  for (const dep of deps) {
    if (dep.includes('*')) {
      await cache.deletePattern(dep);
    } else {
      await cache.delete(dep);
    }
  }
}
```

## Cache Warming Strategies

### 1. Scheduled Cache Warming
```javascript
// Warm popular products cache
cron.schedule('*/30 * * * *', async () => {
  const popularProducts = await Product.find()
    .sort({ views: -1 })
    .limit(100);
  
  for (const product of popularProducts) {
    await cache.set(
      `product:${product._id}`,
      product,
      7200 // 2 hours for popular products
    );
  }
});
```

### 2. Predictive Cache Warming
```javascript
// Warm cache based on user behavior
async function warmUserRelatedCache(userId) {
  const user = await User.findById(userId);
  
  // Warm frequently accessed data
  await Promise.all([
    cache.set(`user:${userId}:profile`, user.profile),
    cache.set(`user:${userId}:preferences`, user.preferences),
    cache.set(`user:${userId}:history`, user.recentlyViewed)
  ]);
  
  // Warm products from user's wishlist
  const wishlistProducts = await Product.find({
    _id: { $in: user.wishlist }
  });
  
  await cache.mset(
    wishlistProducts.reduce((acc, product) => {
      acc[`product:${product._id}`] = product;
      return acc;
    }, {})
  );
}
```

### 3. Lazy Loading with Background Refresh
```javascript
// Stale-while-revalidate pattern
async function getWithBackgroundRefresh(key, fetchFn, ttl) {
  const cached = await cache.get(key);
  
  if (cached) {
    // Check if nearing expiration
    const age = await cache.ttl(key);
    if (age < ttl * 0.2) { // 20% of TTL remaining
      // Refresh in background
      setImmediate(async () => {
        try {
          const fresh = await fetchFn();
          await cache.set(key, fresh, ttl);
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      });
    }
    
    return cached;
  }
  
  // Cache miss - fetch and cache
  const data = await fetchFn();
  await cache.set(key, data, ttl);
  return data;
}
```

## Monitoring and Metrics

### Cache Performance Metrics
```javascript
// Track cache performance
class CacheMetrics {
  constructor() {
    this.metrics = {
      hits: new prometheus.Counter({
        name: 'cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['service', 'operation']
      }),
      misses: new prometheus.Counter({
        name: 'cache_misses_total',
        help: 'Total number of cache misses',
        labelNames: ['service', 'operation']
      }),
      latency: new prometheus.Histogram({
        name: 'cache_operation_duration_seconds',
        help: 'Cache operation latency',
        labelNames: ['service', 'operation', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
      })
    };
  }
  
  recordHit(service, operation) {
    this.metrics.hits.labels(service, operation).inc();
  }
  
  recordMiss(service, operation) {
    this.metrics.misses.labels(service, operation).inc();
  }
  
  recordLatency(service, operation, duration, status) {
    this.metrics.latency
      .labels(service, operation, status)
      .observe(duration);
  }
}
```

## Best Practices

1. **Cache Key Design**
   - Use consistent, hierarchical key patterns
   - Include version numbers for easy invalidation
   - Hash complex keys to avoid length issues

2. **TTL Strategy**
   - Shorter TTL for frequently changing data
   - Longer TTL for static content
   - Use sliding expiration for session data

3. **Memory Management**
   - Set max memory limits
   - Use eviction policies (LRU, LFU)
   - Monitor memory usage

4. **Error Handling**
   - Graceful degradation on cache failure
   - Fallback to database
   - Circuit breakers for cache services

5. **Security Considerations**
   - Encrypt sensitive cached data
   - Use separate cache instances for different security contexts
   - Implement cache key namespacing