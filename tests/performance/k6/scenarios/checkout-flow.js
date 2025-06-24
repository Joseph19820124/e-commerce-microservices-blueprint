import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

const products = new SharedArray('products', function () {
  return JSON.parse(open('./data/products.json'));
});

export const options = {
  scenarios: {
    checkout_flow: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '5m', target: 50 },   // Ramp up to 50 checkouts per minute
        { duration: '10m', target: 100 }, // Ramp up to 100 checkouts per minute
        { duration: '5m', target: 50 },   // Ramp down
      ],
    },
  },
  thresholds: {
    'http_req_duration{scenario:checkout_flow}': ['p(95)<3000'],
    'http_req_failed{scenario:checkout_flow}': ['rate<0.05'],
    'checks{scenario:checkout_flow}': ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  const selectedProducts = [];
  
  // Step 1: Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  const token = loginRes.json('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(2);
  
  // Step 2: Browse and add products to cart
  for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    selectedProducts.push(product);
    
    // View product
    const productRes = http.get(`${BASE_URL}/api/products/${product.id}`, { headers });
    check(productRes, {
      'product loaded': (r) => r.status === 200,
    });
    
    sleep(Math.random() * 3 + 2);
    
    // Add to cart
    const addToCartRes = http.post(
      `${BASE_URL}/api/cart/items`,
      JSON.stringify({ productId: product.id, quantity: Math.floor(Math.random() * 3) + 1 }),
      { headers }
    );
    
    check(addToCartRes, {
      'product added to cart': (r) => r.status === 201 || r.status === 200,
    });
    
    sleep(1);
  }
  
  // Step 3: View cart
  const cartRes = http.get(`${BASE_URL}/api/cart`, { headers });
  check(cartRes, {
    'cart retrieved': (r) => r.status === 200,
    'cart not empty': (r) => r.json('items').length > 0,
  });
  
  sleep(3);
  
  // Step 4: Start checkout
  const checkoutRes = http.post(
    `${BASE_URL}/api/checkout/start`,
    JSON.stringify({}),
    { headers }
  );
  
  check(checkoutRes, {
    'checkout started': (r) => r.status === 200,
  });
  
  const checkoutId = checkoutRes.json('checkoutId');
  
  // Step 5: Add shipping address
  const shippingRes = http.put(
    `${BASE_URL}/api/checkout/${checkoutId}/shipping`,
    JSON.stringify({
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      method: 'standard',
    }),
    { headers }
  );
  
  check(shippingRes, {
    'shipping added': (r) => r.status === 200,
  });
  
  sleep(2);
  
  // Step 6: Add payment method
  const paymentRes = http.put(
    `${BASE_URL}/api/checkout/${checkoutId}/payment`,
    JSON.stringify({
      method: 'card',
      card: {
        number: '4111111111111111',
        expMonth: '12',
        expYear: '2025',
        cvv: '123',
      },
    }),
    { headers }
  );
  
  check(paymentRes, {
    'payment added': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // Step 7: Complete order
  const orderRes = http.post(
    `${BASE_URL}/api/checkout/${checkoutId}/complete`,
    JSON.stringify({}),
    { headers }
  );
  
  check(orderRes, {
    'order completed': (r) => r.status === 200,
    'order number received': (r) => r.json('orderNumber') !== '',
  });
  
  // Step 8: View order confirmation
  if (orderRes.status === 200) {
    const orderId = orderRes.json('orderId');
    const confirmationRes = http.get(`${BASE_URL}/api/orders/${orderId}`, { headers });
    
    check(confirmationRes, {
      'order confirmation loaded': (r) => r.status === 200,
    });
  }
  
  sleep(5);
}