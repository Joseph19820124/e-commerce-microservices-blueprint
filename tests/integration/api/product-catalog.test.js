const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../services/product-catalog/src/index');
const Product = require('../../../services/product-catalog/src/models/Product');

describe('Product Catalog API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_product_catalog';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    // Clean database before each test
    await Product.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    await Product.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/products', () => {
    it('should return empty array when no products exist', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return products with pagination', async () => {
      // Create test products
      const products = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: 99.99,
          category: 'Electronics',
          stock: 10,
        },
        {
          name: 'Product 2',
          description: 'Description 2',
          price: 149.99,
          category: 'Electronics',
          stock: 5,
        },
        {
          name: 'Product 3',
          description: 'Description 3',
          price: 199.99,
          category: 'Books',
          stock: 20,
        },
      ];

      await Product.insertMany(products);

      const response = await request(app)
        .get('/api/products?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBe(2);
    });

    it('should filter products by category', async () => {
      const products = [
        {
          name: 'Laptop',
          description: 'Gaming laptop',
          price: 999.99,
          category: 'Electronics',
          stock: 5,
        },
        {
          name: 'Book',
          description: 'Programming book',
          price: 29.99,
          category: 'Books',
          stock: 50,
        },
      ];

      await Product.insertMany(products);

      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Laptop');
    });

    it('should filter products by price range', async () => {
      const products = [
        {
          name: 'Cheap Product',
          price: 10.00,
          category: 'Test',
          stock: 10,
        },
        {
          name: 'Medium Product',
          price: 50.00,
          category: 'Test',
          stock: 10,
        },
        {
          name: 'Expensive Product',
          price: 200.00,
          category: 'Test',
          stock: 10,
        },
      ];

      await Product.insertMany(products);

      const response = await request(app)
        .get('/api/products?minPrice=20&maxPrice=100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Medium Product');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        category: 'Test',
        stock: 10,
      });

      const savedProduct = await product.save();

      const response = await request(app)
        .get(`/api/products/${savedProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.data.price).toBe(99.99);
    });

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 for invalid product id', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'New Product',
        description: 'New product description',
        price: 149.99,
        category: 'Electronics',
        subcategory: 'Smartphones',
        brand: 'TestBrand',
        stock: 25,
        sku: 'TEST-001',
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newProduct.name);
      expect(response.body.data.price).toBe(newProduct.price);

      // Verify product was saved to database
      const savedProduct = await Product.findById(response.body.data.id);
      expect(savedProduct).toBeTruthy();
      expect(savedProduct.name).toBe(newProduct.name);
    });

    it('should return validation error for missing required fields', async () => {
      const invalidProduct = {
        description: 'Missing name and price',
      };

      const response = await request(app)
        .post('/api/products')
        .send(invalidProduct)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should return validation error for negative price', async () => {
      const invalidProduct = {
        name: 'Invalid Product',
        price: -10,
        category: 'Test',
        stock: 10,
      };

      const response = await request(app)
        .post('/api/products')
        .send(invalidProduct)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update an existing product', async () => {
      const product = new Product({
        name: 'Original Product',
        description: 'Original description',
        price: 99.99,
        category: 'Electronics',
        stock: 10,
      });

      const savedProduct = await product.save();

      const updateData = {
        name: 'Updated Product',
        price: 149.99,
        stock: 15,
      };

      const response = await request(app)
        .put(`/api/products/${savedProduct._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Product');
      expect(response.body.data.price).toBe(149.99);
      expect(response.body.data.stock).toBe(15);

      // Verify update in database
      const updatedProduct = await Product.findById(savedProduct._id);
      expect(updatedProduct.name).toBe('Updated Product');
      expect(updatedProduct.price).toBe(149.99);
    });

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/products/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete an existing product', async () => {
      const product = new Product({
        name: 'Product to Delete',
        description: 'Will be deleted',
        price: 99.99,
        category: 'Test',
        stock: 10,
      });

      const savedProduct = await product.save();

      const response = await request(app)
        .delete(`/api/products/${savedProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');

      // Verify deletion in database
      const deletedProduct = await Product.findById(savedProduct._id);
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('PATCH /api/products/bulk/inventory', () => {
    it('should update inventory for multiple products', async () => {
      const products = [
        {
          name: 'Product 1',
          price: 99.99,
          category: 'Test',
          stock: 20,
        },
        {
          name: 'Product 2',
          price: 149.99,
          category: 'Test',
          stock: 15,
        },
      ];

      const savedProducts = await Product.insertMany(products);

      const inventoryUpdates = {
        updates: [
          {
            productId: savedProducts[0]._id.toString(),
            quantity: -5, // Decrease by 5
          },
          {
            productId: savedProducts[1]._id.toString(),
            quantity: 10, // Increase by 10
          },
        ],
      };

      const response = await request(app)
        .patch('/api/products/bulk/inventory')
        .send(inventoryUpdates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inventory updated successfully');

      // Verify updates in database
      const updatedProduct1 = await Product.findById(savedProducts[0]._id);
      const updatedProduct2 = await Product.findById(savedProducts[1]._id);

      expect(updatedProduct1.stock).toBe(15); // 20 - 5
      expect(updatedProduct2.stock).toBe(25); // 15 + 10
    });

    it('should return error for insufficient stock', async () => {
      const product = new Product({
        name: 'Low Stock Product',
        price: 99.99,
        category: 'Test',
        stock: 5,
      });

      const savedProduct = await product.save();

      const inventoryUpdates = {
        updates: [
          {
            productId: savedProduct._id.toString(),
            quantity: -10, // Try to decrease by more than available
          },
        ],
      };

      const response = await request(app)
        .patch('/api/products/bulk/inventory')
        .send(inventoryUpdates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient stock');
    });
  });

  describe('GET /api/products/search', () => {
    it('should search products by name', async () => {
      const products = [
        {
          name: 'iPhone 13 Pro',
          description: 'Latest iPhone model',
          price: 999.99,
          category: 'Electronics',
          stock: 10,
        },
        {
          name: 'Samsung Galaxy',
          description: 'Android smartphone',
          price: 799.99,
          category: 'Electronics',
          stock: 15,
        },
        {
          name: 'MacBook Pro',
          description: 'Apple laptop',
          price: 1999.99,
          category: 'Electronics',
          stock: 5,
        },
      ];

      await Product.insertMany(products);

      const response = await request(app)
        .get('/api/products/search?q=iPhone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('iPhone 13 Pro');
    });

    it('should return empty array for no matches', async () => {
      const products = [
        {
          name: 'Product 1',
          price: 99.99,
          category: 'Test',
          stock: 10,
        },
      ];

      await Product.insertMany(products);

      const response = await request(app)
        .get('/api/products/search?q=NonExistentProduct')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });
});