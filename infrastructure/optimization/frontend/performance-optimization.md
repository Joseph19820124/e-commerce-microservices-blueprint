# Frontend Performance Optimization Guide

## Overview

This guide covers comprehensive frontend optimization techniques for the e-commerce platform to achieve optimal Core Web Vitals scores and excellent user experience.

## Performance Metrics Target

- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.5s
- **First Contentful Paint (FCP)**: < 1.8s

## Optimization Strategies

### 1. Bundle Size Optimization

#### Code Splitting
```javascript
// Route-based code splitting
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </Suspense>
  );
}

// Component-based code splitting
const HeavyComponent = lazy(() => 
  import(/* webpackChunkName: "heavy-component" */ './components/HeavyComponent')
);
```

#### Tree Shaking
```javascript
// Use ES6 imports for better tree shaking
import { debounce } from 'lodash-es'; // ✅ Good
// import _ from 'lodash'; // ❌ Bad - imports entire library

// Use production builds
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false,
  }
};
```

### 2. Image Optimization

#### Responsive Images
```jsx
// Image component with optimization
const OptimizedImage = ({ src, alt, sizes }) => {
  const generateSrcSet = (src) => {
    const widths = [320, 640, 768, 1024, 1280, 1920];
    return widths
      .map(w => `${src}?w=${w} ${w}w`)
      .join(', ');
  };

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={generateSrcSet(src.replace(/\.(jpg|png)$/, '.webp'))}
        sizes={sizes}
      />
      <source
        type="image/jpeg"
        srcSet={generateSrcSet(src)}
        sizes={sizes}
      />
      <img
        src={`${src}?w=1280`}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </picture>
  );
};
```

#### Lazy Loading with Intersection Observer
```javascript
const useImageLazyLoad = () => {
  useEffect(() => {
    const images = document.querySelectorAll('img[data-lazy]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.lazy;
          img.removeAttribute('data-lazy');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    images.forEach(img => imageObserver.observe(img));

    return () => imageObserver.disconnect();
  }, []);
};
```

### 3. Critical CSS and Font Loading

#### Critical CSS Extraction
```html
<!-- Inline critical CSS -->
<style>
  /* Critical CSS for above-the-fold content */
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .header { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .hero { min-height: 400px; background: #f5f5f5; }
  /* ... other critical styles ... */
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/css/main.css"></noscript>
```

#### Font Loading Optimization
```css
/* Font face with display swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2'),
       url('/fonts/inter-regular.woff') format('woff');
  font-weight: 400;
  font-display: swap; /* Show fallback font immediately */
}

/* Preload critical fonts */
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
```

### 4. React Performance Optimization

#### Memoization and Optimization Hooks
```javascript
// Memoize expensive components
const ProductCard = React.memo(({ product, onAddToCart }) => {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>
        Add to Cart
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.product.id === nextProps.product.id &&
         prevProps.product.price === nextProps.product.price;
});

// Use useMemo for expensive calculations
const ProductList = ({ products, filters }) => {
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return product.price >= filters.minPrice &&
             product.price <= filters.maxPrice &&
             product.category === filters.category;
    });
  }, [products, filters]);

  // Use useCallback for stable function references
  const handleAddToCart = useCallback((productId) => {
    dispatch(addToCart(productId));
  }, [dispatch]);

  return (
    <div className="product-grid">
      {filteredProducts.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
};
```

#### Virtual Scrolling for Large Lists
```javascript
import { FixedSizeList } from 'react-window';

const VirtualProductList = ({ products }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={250}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 5. Network Optimization

#### API Request Optimization
```javascript
// Request deduplication and caching
class APIClient {
  constructor() {
    this.cache = new Map();
    this.pending = new Map();
  }

  async get(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    // Return cached response if fresh
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < 300000) { // 5 minutes
        return data;
      }
    }

    // Deduplicate concurrent requests
    if (this.pending.has(cacheKey)) {
      return this.pending.get(cacheKey);
    }

    const promise = fetch(url, options)
      .then(res => res.json())
      .then(data => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        this.pending.delete(cacheKey);
        return data;
      });

    this.pending.set(cacheKey, promise);
    return promise;
  }
}

// GraphQL query batching
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const batchLink = new BatchHttpLink({
  uri: '/graphql',
  batchMax: 5,
  batchInterval: 20,
});
```

### 6. Rendering Optimization

#### Progressive Hydration
```javascript
// Hydrate critical components first
import { hydrateRoot } from 'react-dom/client';

const container = document.getElementById('root');

// Hydrate header immediately
hydrateRoot(
  document.getElementById('header'),
  <Header />
);

// Defer main content hydration
requestIdleCallback(() => {
  hydrateRoot(
    document.getElementById('main'),
    <App />
  );
});
```

#### Optimize Re-renders
```javascript
// Use React DevTools Profiler to identify unnecessary re-renders
// Implement proper state management
const useProductState = create((set) => ({
  products: [],
  filters: {},
  
  // Batch updates
  updateFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  
  // Selective subscriptions
  getFilteredProducts: (state) => {
    return state.products.filter(/* ... */);
  }
}));

// Component subscribes only to what it needs
const ProductCount = () => {
  const count = useProductState(state => state.products.length);
  return <span>({count} products)</span>;
};
```

### 7. Web Vitals Optimization

#### Largest Contentful Paint (LCP)
```javascript
// Preload hero image
<link rel="preload" as="image" href="/hero-image.jpg" />

// Priority hints
<img src="/hero-image.jpg" fetchpriority="high" />

// Resource hints
<link rel="dns-prefetch" href="//cdn.example.com" />
<link rel="preconnect" href="//api.example.com" />
```

#### Cumulative Layout Shift (CLS)
```css
/* Reserve space for images */
.product-image {
  aspect-ratio: 1 / 1;
  background: #f0f0f0;
}

/* Prevent layout shift from fonts */
.text {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  min-height: 1.5em;
}

/* Reserve space for dynamic content */
.ad-container {
  min-height: 250px;
  contain: layout;
}
```

### 8. Service Worker Strategies

```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,png,jpg,json}'],
  swDest: 'dist/sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.example\.com\/products/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'products-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 3600 // 1 hour
        }
      }
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
};
```

### 9. Build Optimization

#### Webpack Configuration
```javascript
// Advanced webpack optimization
module.exports = {
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    })
  ]
};
```

### 10. Monitoring and Analytics

```javascript
// Performance monitoring
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  
  // Use `sendBeacon` for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getFCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Custom performance marks
performance.mark('product-list-start');
// ... render product list ...
performance.mark('product-list-end');
performance.measure('product-list-render', 'product-list-start', 'product-list-end');
```

## Performance Budget

```json
{
  "bundles": [
    {
      "name": "main",
      "maxSize": "200 KB"
    },
    {
      "name": "vendor",
      "maxSize": "300 KB"
    }
  ],
  "assets": {
    "images": {
      "maxSize": "200 KB",
      "format": ["webp", "jpg"]
    },
    "fonts": {
      "maxSize": "50 KB",
      "format": ["woff2"]
    }
  },
  "metrics": {
    "lighthouse": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 95,
      "seo": 100
    }
  }
}