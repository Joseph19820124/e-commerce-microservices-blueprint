const mongoose = require('mongoose');
const Product = require('../../../../../services/product-catalog/src/models/Product');

describe('Product Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid product', () => {
      const validProduct = new Product({
        name: 'Test Product',
        description: 'A test product description',
        price: 99.99,
        category: 'Electronics',
        subcategory: 'Smartphones',
        brand: 'TestBrand',
        images: ['image1.jpg', 'image2.jpg'],
        stock: 100,
        sku: 'TEST-001',
        features: ['Feature 1', 'Feature 2'],
        specifications: {
          weight: '200g',
          dimensions: '10x5x2cm',
        },
      });

      const error = validProduct.validateSync();
      expect(error).toBeUndefined();
    });

    it('should require name field', () => {
      const product = new Product({
        price: 99.99,
        category: 'Electronics',
        stock: 100,
      });

      const error = product.validateSync();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.kind).toBe('required');
    });

    it('should require price field', () => {
      const product = new Product({
        name: 'Test Product',
        category: 'Electronics',
        stock: 100,
      });

      const error = product.validateSync();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.price.kind).toBe('required');
    });

    it('should enforce minimum price of 0', () => {
      const product = new Product({
        name: 'Test Product',
        price: -10,
        category: 'Electronics',
        stock: 100,
      });

      const error = product.validateSync();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.price.kind).toBe('min');
    });

    it('should enforce minimum stock of 0', () => {
      const product = new Product({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        stock: -5,
      });

      const error = product.validateSync();
      expect(error.errors.stock).toBeDefined();
      expect(error.errors.stock.kind).toBe('min');
    });

    it('should limit images array to 10 items', () => {
      const images = Array(11).fill('image.jpg');
      const product = new Product({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        stock: 100,
        images,
      });

      const error = product.validateSync();
      expect(error.errors.images).toBeDefined();
    });

    it('should set default values', () => {
      const product = new Product({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
      });

      expect(product.stock).toBe(0);
      expect(product.isActive).toBe(true);
      expect(product.ratings.average).toBe(0);
      expect(product.ratings.count).toBe(0);
      expect(product.images).toEqual([]);
      expect(product.features).toEqual([]);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      const product = new Product({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        stock: 100,
      });

      expect(product.createdAt).toBeDefined();
      expect(product.updatedAt).toBeDefined();
    });
  });

  describe('Methods', () => {
    it('should have toJSON method that transforms output', () => {
      const product = new Product({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        stock: 100,
      });

      const json = product.toJSON();
      expect(json.id).toBeDefined();
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

  describe('Indexes', () => {
    it('should have required indexes defined', () => {
      const indexes = Product.schema.indexes();
      
      // Check for name text index
      const nameIndex = indexes.find(idx => idx[0].name === 'text');
      expect(nameIndex).toBeDefined();
      
      // Check for category index
      const categoryIndex = indexes.find(idx => idx[0].category === 1);
      expect(categoryIndex).toBeDefined();
      
      // Check for compound index
      const compoundIndex = indexes.find(idx => 
        idx[0].category === 1 && idx[0].subcategory === 1
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate availability based on stock', () => {
      const productInStock = new Product({
        name: 'In Stock Product',
        price: 99.99,
        category: 'Electronics',
        stock: 10,
      });

      const productOutOfStock = new Product({
        name: 'Out of Stock Product',
        price: 99.99,
        category: 'Electronics',
        stock: 0,
      });

      expect(productInStock.availability).toBe('in_stock');
      expect(productOutOfStock.availability).toBe('out_of_stock');
    });
  });
});