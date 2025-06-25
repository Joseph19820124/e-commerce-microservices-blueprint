// Jest setup for product-catalog service
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-product-catalog';

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock winston logger to reduce noise in tests
jest.mock('./src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Global test utilities
global.testUtils = {
  // Helper to create test product data
  createTestProduct: (overrides = {}) => ({
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category: 'Electronics',
    stock: 100,
    images: [],
    ...overrides
  }),
  
  // Helper to clean up test data
  cleanupTestData: async (model) => {
    if (model && model.deleteMany) {
      await model.deleteMany({});
    }
  }
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections if needed
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});