// Unit tests for Product Controller
const request = require('supertest');
const express = require('express');
const productController = require('../../controllers/productController');
const Product = require('../../models/Product');

// Mock the Product model
jest.mock('../../models/Product');

describe('Product Controller - Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/products', productController.getAllProducts);
    app.get('/products/:id', productController.getProductById);
    app.post('/products', productController.createProduct);
    app.put('/products/:id', productController.updateProduct);
    app.delete('/products/:id', productController.deleteProduct);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /products', () => {
    it('should return all products successfully', async () => {
      const mockProducts = [
        testUtils.createTestProduct({ id: '1', name: 'Product 1' }),
        testUtils.createTestProduct({ id: '2', name: 'Product 2' })
      ];

      Product.find.mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Product 1');
      expect(Product.find).toHaveBeenCalledWith({});
    });

    it('should handle database errors', async () => {
      const errorMessage = 'Database connection failed';
      Product.find.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/products')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error fetching products');
    });

    it('should apply category filter when provided', async () => {
      const mockProducts = [
        testUtils.createTestProduct({ category: 'Electronics' })
      ];

      Product.find.mockResolvedValue(mockProducts);

      await request(app)
        .get('/products?category=Electronics')
        .expect(200);

      expect(Product.find).toHaveBeenCalledWith({ category: 'Electronics' });
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id successfully', async () => {
      const mockProduct = testUtils.createTestProduct({ id: '123' });
      Product.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/products/123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('123');
      expect(Product.findById).toHaveBeenCalledWith('123');
    });

    it('should return 404 when product not found', async () => {
      Product.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/products/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });

    it('should handle invalid ObjectId format', async () => {
      Product.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));

      const response = await request(app)
        .get('/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /products', () => {
    it('should create a new product successfully', async () => {
      const newProductData = testUtils.createTestProduct();
      const savedProduct = { ...newProductData, _id: '123' };

      Product.prototype.save = jest.fn().mockResolvedValue(savedProduct);
      Product.mockImplementation(() => ({
        save: Product.prototype.save
      }));

      const response = await request(app)
        .post('/products')
        .send(newProductData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('123');
      expect(Product.prototype.save).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidProductData = { name: '' }; // Missing required fields

      const response = await request(app)
        .post('/products')
        .send(invalidProductData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle duplicate product names', async () => {
      const productData = testUtils.createTestProduct();
      
      Product.prototype.save = jest.fn().mockRejectedValue({
        code: 11000,
        keyPattern: { name: 1 }
      });
      Product.mockImplementation(() => ({
        save: Product.prototype.save
      }));

      const response = await request(app)
        .post('/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product successfully', async () => {
      const updateData = { name: 'Updated Product', price: 199.99 };
      const updatedProduct = testUtils.createTestProduct({ ...updateData, id: '123' });

      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      const response = await request(app)
        .put('/products/123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Product');
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        updateData,
        { new: true, runValidators: true }
      );
    });

    it('should return 404 when updating non-existent product', async () => {
      Product.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/products/nonexistent')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product successfully', async () => {
      const deletedProduct = testUtils.createTestProduct({ id: '123' });
      Product.findByIdAndDelete.mockResolvedValue(deletedProduct);

      const response = await request(app)
        .delete('/products/123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
      expect(Product.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    it('should return 404 when deleting non-existent product', async () => {
      Product.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .delete('/products/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });
});