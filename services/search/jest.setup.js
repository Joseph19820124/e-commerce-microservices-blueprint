// Jest setup for search service
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3004';
process.env.ELASTICSEARCH_URL = 'http://localhost:9200';
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

// Mock Elasticsearch client
jest.mock('./src/services/elasticsearchClient', () => ({
  search: jest.fn(),
  index: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  indices: {
    create: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn()
  }
}));

// Global test utilities
global.testUtils = {
  // Helper to create test search query
  createTestSearchQuery: (overrides = {}) => ({
    query: 'test product',
    category: 'Electronics',
    minPrice: 0,
    maxPrice: 1000,
    page: 1,
    limit: 10,
    ...overrides
  }),
  
  // Helper to create test product for indexing
  createTestProductForSearch: (overrides = {}) => ({
    id: 'test-product-id',
    name: 'Test Product',
    description: 'Test Description',
    category: 'Electronics',
    price: 99.99,
    stock: 100,
    tags: ['test', 'product'],
    ...overrides
  }),
  
  // Helper to mock Elasticsearch response
  mockElasticsearchResponse: (hits = [], total = 0) => ({
    hits: {
      hits: hits.map(hit => ({
        _source: hit,
        _score: 1.0
      })),
      total: { value: total }
    }
  })
};

// Clean up after all tests
afterAll(async () => {
  // Clean up any HTTP interceptors
  const nock = require('nock');
  nock.cleanAll();
});