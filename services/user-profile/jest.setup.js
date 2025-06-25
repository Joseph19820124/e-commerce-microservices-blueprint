// Jest setup for user-profile service
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-user-profile';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '7d';

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
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Test123!',
    phone: '+1234567890',
    ...overrides
  }),
  
  // Helper to generate test JWT token
  generateTestToken: (userId = 'test-user-id') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
  },
  
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