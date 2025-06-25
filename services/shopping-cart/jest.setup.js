// Jest setup for shopping-cart service
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3003';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PRODUCT_CATALOG_URL = 'http://localhost:3001';

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock winston logger to reduce noise in tests
jest.mock('./src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock Redis client with redis-mock
jest.mock('./src/services/redisClient', () => {
  const redisMock = require('redis-mock');
  return redisMock.createClient();
});

// Global test utilities
global.testUtils = {
  // Helper to create test cart data
  createTestCartItem: (overrides = {}) => ({
    productId: 'test-product-id',
    quantity: 1,
    price: 99.99,
    name: 'Test Product',
    ...overrides
  }),
  
  // Helper to create test user session
  createTestSession: (userId = 'test-user-id') => ({
    userId,
    cartId: `cart:${userId}`,
    createdAt: new Date().toISOString()
  }),
  
  // Helper to clean up Redis test data
  cleanupRedisData: async (redisClient, pattern = 'test:*') => {
    if (redisClient && redisClient.flushdb) {
      await redisClient.flushdb();
    }
  }
};

// Clean up after all tests
afterAll(async () => {
  // No specific cleanup needed for redis-mock
});