const { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  searchProducts,
  updateInventory
} = require('../../../../../services/product-catalog/src/controllers/productController');
const Product = require('../../../../../services/product-catalog/src/models/Product');

// Mock the Product model
jest.mock('../../../../../services/product-catalog/src/models/Product');

describe('Product Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('should return all products with pagination', async () => {
      const mockProducts = [
        { _id: '1', name: 'Product 1', price: 100 },
        { _id: '2', name: 'Product 2', price: 200 },
      ];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProducts),
      };
      
      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(2);

      req.query = { page: '1', limit: '10' };

      await getAllProducts(req, res);

      expect(Product.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProducts,
        pagination: {
          total: 2,
          page: 1,
          pages: 1,
        },
      });
    });

    it('should filter products by category', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      
      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(0);

      req.query = { category: 'electronics' };

      await getAllProducts(req, res);

      expect(Product.find).toHaveBeenCalledWith({ category: 'electronics' });
    });

    it('should handle errors', async () => {
      Product.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error fetching products',
      });
    });
  });

  describe('getProductById', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Product',
        price: 99.99,
      };

      Product.findById.mockResolvedValue(mockProduct);
      req.params.id = '507f1f77bcf86cd799439011';

      await getProductById(req, res);

      expect(Product.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
      });
    });

    it('should return 404 if product not found', async () => {
      Product.findById.mockResolvedValue(null);
      req.params.id = '507f1f77bcf86cd799439011';

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const newProductData = {
        name: 'New Product',
        description: 'A new product',
        price: 149.99,
        category: 'electronics',
        stock: 100,
      };

      const mockCreatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        ...newProductData,
      };

      Product.prototype.save = jest.fn().mockResolvedValue(mockCreatedProduct);
      Product.mockImplementation(() => mockCreatedProduct);

      req.body = newProductData;

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedProduct,
      });
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      Product.prototype.save = jest.fn().mockRejectedValue(error);
      Product.mockImplementation(() => ({}));

      req.body = { name: 'Invalid Product' };

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const updatedData = {
        name: 'Updated Product',
        price: 199.99,
      };

      const mockUpdatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        ...updatedData,
      };

      Product.findByIdAndUpdate.mockResolvedValue(mockUpdatedProduct);

      req.params.id = '507f1f77bcf86cd799439011';
      req.body = updatedData;

      await updateProduct(req, res);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updatedData,
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProduct,
      });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Product to Delete',
      };

      Product.findByIdAndDelete.mockResolvedValue(mockProduct);

      req.params.id = '507f1f77bcf86cd799439011';

      await deleteProduct(req, res);

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product deleted successfully',
      });
    });
  });

  describe('updateInventory', () => {
    it('should update product inventory', async () => {
      const updates = [
        { productId: '507f1f77bcf86cd799439011', quantity: -5 },
        { productId: '507f1f77bcf86cd799439012', quantity: 10 },
      ];

      const mockProduct1 = {
        _id: '507f1f77bcf86cd799439011',
        stock: 20,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProduct2 = {
        _id: '507f1f77bcf86cd799439012',
        stock: 30,
        save: jest.fn().mockResolvedValue(true),
      };

      Product.findById
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);

      req.body = { updates };

      await updateInventory(req, res);

      expect(mockProduct1.stock).toBe(15);
      expect(mockProduct2.stock).toBe(40);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Inventory updated successfully',
      });
    });

    it('should handle insufficient stock', async () => {
      const updates = [
        { productId: '507f1f77bcf86cd799439011', quantity: -50 },
      ];

      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        stock: 20,
      };

      Product.findById.mockResolvedValue(mockProduct);

      req.body = { updates };

      await updateInventory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Insufficient stock'),
      });
    });
  });
});