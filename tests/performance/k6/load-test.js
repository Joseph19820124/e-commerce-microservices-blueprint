import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load test
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },  // Ramp up to 100 users
        { duration: '10m', target: 100 }, // Stay at 100 users
        { duration: '5m', target: 200 },  // Ramp up to 200 users
        { duration: '10m', target: 200 }, // Stay at 200 users
        { duration: '5m', target: 0 },    // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'load' },
    },
    
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Spike to 1000 users
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],                   // Error rate under 10%
    errors: ['rate<0.1'],                            // Custom error rate under 10%
    api_latency: ['p(95)<500', 'p(99)<1000'],       // API latency thresholds
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const PRODUCTS = [
  '6507f1f8-1a45-4a8e-9c2d-123456789001',
  '6507f1f8-1a45-4a8e-9c2d-123456789002',
  '6507f1f8-1a45-4a8e-9c2d-123456789003',
  '6507f1f8-1a45-4a8e-9c2d-123456789004',
  '6507f1f8-1a45-4a8e-9c2d-123456789005',
];

const USERS = [
  { email: 'user1@example.com', password: 'password123' },
  { email: 'user2@example.com', password: 'password123' },
  { email: 'user3@example.com', password: 'password123' },
];

// Helper functions
function authenticateUser() {
  const user = randomItem(USERS);
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'auth token returned': (r) => r.json('token') !== '',
  });
  
  if (loginRes.status !== 200) {
    errorRate.add(1);
    return null;
  }
  
  return loginRes.json('token');
}

// Test scenarios
export default function () {
  const token = authenticateUser();
  if (!token) return;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  group('Browse Products', () => {
    // Get product list
    const start = Date.now();
    const productsRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`, { headers });
    apiLatency.add(Date.now() - start);
    
    check(productsRes, {
      'products retrieved': (r) => r.status === 200,
      'products array returned': (r) => Array.isArray(r.json('data')),
    });
    
    if (productsRes.status !== 200) {
      errorRate.add(1);
    }
    
    sleep(randomIntBetween(1, 3));
    
    // View product details
    const productId = randomItem(PRODUCTS);
    const productRes = http.get(`${BASE_URL}/api/products/${productId}`, { headers });
    
    check(productRes, {
      'product details retrieved': (r) => r.status === 200,
      'product has required fields': (r) => {
        const product = r.json();
        return product.id && product.name && product.price;
      },
    });
    
    if (productRes.status !== 200) {
      errorRate.add(1);
    }
  });
  
  group('Shopping Cart', () => {
    // Add to cart
    const addToCartPayload = {
      productId: randomItem(PRODUCTS),
      quantity: randomIntBetween(1, 3),
    };
    
    const addToCartRes = http.post(
      `${BASE_URL}/api/cart/items`,
      JSON.stringify(addToCartPayload),
      { headers }
    );
    
    check(addToCartRes, {
      'item added to cart': (r) => r.status === 201 || r.status === 200,
    });
    
    if (addToCartRes.status !== 201 && addToCartRes.status !== 200) {
      errorRate.add(1);
    }
    
    sleep(randomIntBetween(2, 5));
    
    // Get cart
    const cartRes = http.get(`${BASE_URL}/api/cart`, { headers });
    
    check(cartRes, {
      'cart retrieved': (r) => r.status === 200,
      'cart has items': (r) => r.json('items') && r.json('items').length > 0,
    });
    
    if (cartRes.status !== 200) {
      errorRate.add(1);
    }
  });
  
  group('Search', () => {
    const searchTerms = ['laptop', 'phone', 'tablet', 'camera', 'headphones'];
    const searchTerm = randomItem(searchTerms);
    
    const searchRes = http.get(
      `${BASE_URL}/api/search?q=${searchTerm}&limit=10`,
      { headers }
    );
    
    check(searchRes, {
      'search successful': (r) => r.status === 200,
      'search returns results': (r) => Array.isArray(r.json('results')),
    });
    
    if (searchRes.status !== 200) {
      errorRate.add(1);
    }
  });
  
  group('User Profile', () => {
    // Get user profile
    const profileRes = http.get(`${BASE_URL}/api/users/profile`, { headers });
    
    check(profileRes, {
      'profile retrieved': (r) => r.status === 200,
      'profile has user data': (r) => r.json('email') !== '',
    });
    
    if (profileRes.status !== 200) {
      errorRate.add(1);
    }
    
    // Update profile
    const updatePayload = {
      firstName: `User${randomIntBetween(1, 1000)}`,
      lastName: 'Test',
      phone: `+1555${randomIntBetween(1000000, 9999999)}`,
    };
    
    const updateRes = http.patch(
      `${BASE_URL}/api/users/profile`,
      JSON.stringify(updatePayload),
      { headers }
    );
    
    check(updateRes, {
      'profile updated': (r) => r.status === 200,
    });
    
    if (updateRes.status !== 200) {
      errorRate.add(1);
    }
  });
  
  // Think time between iterations
  sleep(randomIntBetween(5, 10));
}

// Utility functions
function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Lifecycle hooks
export function setup() {
  console.log('🚀 Starting performance test...');
  console.log(`🎯 Target URL: ${BASE_URL}`);
  
  // Verify the system is accessible
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'system is healthy': (r) => r.status === 200,
  });
  
  if (res.status !== 200) {
    throw new Error('System health check failed');
  }
}

export function teardown(data) {
  console.log('✅ Performance test completed');
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}