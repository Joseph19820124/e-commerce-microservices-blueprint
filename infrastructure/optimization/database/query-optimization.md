# Database Query Optimization Guide

## MongoDB Query Optimization

### 1. Index Strategy

#### Product Queries
```javascript
// Optimized query for product search
db.products.find({
  $text: { $search: "laptop" },
  status: "active",
  "inventory.quantity": { $gt: 0 }
})
.sort({ score: { $meta: "textScore" }, popularity: -1 })
.limit(20)
.hint({ name: "text", description: "text" })

// Category browsing with filters
db.products.find({
  category: "electronics",
  "attributes.brand": { $in: ["Apple", "Samsung"] },
  price: { $gte: 100, $lte: 1000 },
  status: "active"
})
.sort({ popularity: -1 })
.hint({ category: 1, "attributes.brand": 1, price: 1 })
```

#### User Queries
```javascript
// Efficient user lookup
db.users.findOne({ 
  email: "user@example.com" 
}).hint({ email: 1 })

// Active users report
db.users.find({
  status: "active",
  "auth.lastLogin": { $gte: new Date(Date.now() - 30*24*60*60*1000) }
})
.sort({ "auth.lastLogin": -1 })
.hint({ status: 1, "auth.lastLogin": -1 })
```

### 2. Aggregation Pipeline Optimizations

```javascript
// Optimized sales analytics pipeline
db.orders.aggregate([
  // Stage 1: Filter first to reduce dataset
  { $match: {
    createdAt: { $gte: startDate, $lte: endDate },
    status: "completed"
  }},
  
  // Stage 2: Project only needed fields early
  { $project: {
    userId: 1,
    total: 1,
    items: 1,
    createdAt: 1
  }},
  
  // Stage 3: Unwind for product analysis
  { $unwind: "$items" },
  
  // Stage 4: Group by product
  { $group: {
    _id: "$items.productId",
    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
    unitsSold: { $sum: "$items.quantity" },
    orderCount: { $sum: 1 }
  }},
  
  // Stage 5: Sort by revenue
  { $sort: { revenue: -1 } },
  
  // Stage 6: Limit results
  { $limit: 100 },
  
  // Stage 7: Lookup product details
  { $lookup: {
    from: "products",
    localField: "_id",
    foreignField: "_id",
    as: "product"
  }},
  
  // Stage 8: Format output
  { $project: {
    productId: "$_id",
    productName: { $arrayElemAt: ["$product.name", 0] },
    revenue: 1,
    unitsSold: 1,
    orderCount: 1
  }}
], {
  allowDiskUse: true,
  hint: { createdAt: -1, status: 1 }
})
```

### 3. Query Patterns to Avoid

```javascript
// ❌ Bad: Using $where with JavaScript
db.products.find({
  $where: "this.price > 100 && this.inventory.quantity > 0"
})

// ✅ Good: Use native operators
db.products.find({
  price: { $gt: 100 },
  "inventory.quantity": { $gt: 0 }
})

// ❌ Bad: Negation operators without index
db.products.find({
  category: { $ne: "electronics" }
})

// ✅ Good: Use positive conditions
db.products.find({
  category: { $in: ["clothing", "home", "sports"] }
})

// ❌ Bad: Large $in arrays
db.products.find({
  _id: { $in: [/* 1000+ IDs */] }
})

// ✅ Good: Batch queries
const batchSize = 100;
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  await db.products.find({ _id: { $in: batch } }).toArray();
}
```

## PostgreSQL Query Optimization

### 1. Index Strategy

```sql
-- User authentication index
CREATE INDEX idx_users_email ON users(email) WHERE status = 'active';

-- Session lookup
CREATE INDEX idx_sessions_token ON sessions(token) 
WHERE expires_at > CURRENT_TIMESTAMP;

-- User activity tracking
CREATE INDEX idx_user_activity ON user_activity(user_id, created_at DESC);

-- Partial index for soft deletes
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

### 2. Query Optimizations

```sql
-- Optimized user profile query with related data
WITH user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as order_count,
    SUM(total) as lifetime_value,
    MAX(created_at) as last_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT 
  u.*,
  COALESCE(us.order_count, 0) as order_count,
  COALESCE(us.lifetime_value, 0) as lifetime_value,
  us.last_order_date
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE u.id = $1;

-- Efficient pagination with cursor
SELECT * FROM users
WHERE created_at < $1  -- cursor from previous page
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Connection Pooling Configuration

```javascript
// PostgreSQL connection pool optimization
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                // Maximum pool size
  min: 5,                 // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
  // Enable prepared statements
  prepare: true
});

// Query with prepared statement
const getUser = {
  name: 'get-user',
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId]
};

const result = await pool.query(getUser);
```

## Redis Query Optimization

### 1. Key Design Patterns

```javascript
// Hierarchical key structure
const keys = {
  user: (id) => `user:${id}`,
  userSessions: (userId) => `user:${userId}:sessions`,
  cart: (userId) => `cart:${userId}`,
  productView: (productId) => `product:${productId}:views`,
  categoryProducts: (category) => `category:${category}:products`
};

// TTL management
await redis.setex(keys.cart(userId), 3600, JSON.stringify(cart)); // 1 hour TTL
```

### 2. Pipeline Operations

```javascript
// Batch operations with pipeline
const pipeline = redis.pipeline();

// Get multiple user carts
userIds.forEach(userId => {
  pipeline.get(keys.cart(userId));
});

// Execute all commands in one round trip
const results = await pipeline.exec();
```

### 3. Lua Scripts for Atomic Operations

```lua
-- Rate limiting script
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
  redis.call('SETEX', key, window, 1)
  return 1
elseif tonumber(current) < limit then
  return redis.call('INCR', key)
else
  return 0
end
```

## Elasticsearch Query Optimization

### 1. Mapping Optimization

```json
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "english"
      },
      "category": {
        "type": "keyword"
      },
      "price": {
        "type": "scaled_float",
        "scaling_factor": 100
      },
      "attributes": {
        "type": "nested",
        "properties": {
          "name": { "type": "keyword" },
          "value": { "type": "keyword" }
        }
      },
      "created_at": {
        "type": "date",
        "format": "epoch_millis"
      }
    }
  }
}
```

### 2. Search Query Optimization

```javascript
// Optimized product search
const searchQuery = {
  index: 'products',
  body: {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: searchTerm,
              fields: ['name^3', 'description', 'category'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          }
        ],
        filter: [
          { term: { status: 'active' } },
          { range: { price: { gte: minPrice, lte: maxPrice } } },
          { range: { 'inventory.quantity': { gt: 0 } } }
        ]
      }
    },
    aggs: {
      categories: {
        terms: { field: 'category', size: 10 }
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 50 },
            { from: 50, to: 100 },
            { from: 100, to: 500 },
            { from: 500 }
          ]
        }
      }
    },
    sort: [
      { _score: { order: 'desc' } },
      { popularity: { order: 'desc' } }
    ],
    size: 20,
    from: 0,
    _source: ['id', 'name', 'price', 'category', 'image_url']
  }
};
```

## General Optimization Tips

1. **Connection Pooling**: Always use connection pools with appropriate limits
2. **Query Profiling**: Enable slow query logs and analyze regularly
3. **Caching Strategy**: Cache frequently accessed, rarely changing data
4. **Batch Operations**: Group multiple operations when possible
5. **Async Processing**: Use queues for heavy operations
6. **Monitor Performance**: Set up alerts for slow queries
7. **Regular Maintenance**: Schedule index rebuilds and statistics updates