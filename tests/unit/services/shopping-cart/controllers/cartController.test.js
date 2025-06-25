const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  mergeGuestCart
} = require('../../../../../services/shopping-cart/src/controllers/cartController');
const cartService = require('../../../../../services/shopping-cart/src/services/cartService');
const productService = require('../../../../../services/shopping-cart/src/services/productService');

// Mock services
jest.mock('../../../../../services/shopping-cart/src/services/cartService');
jest.mock('../../../../../services/shopping-cart/src/services/productService');

describe('Cart Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {},
      sessionID: 'test-session-123',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should get cart for authenticated user', async () => {
      const mockCart = {
        userId: '507f1f77bcf86cd799439011',
        items: [
          {
            productId: '507f1f77bcf86cd799439012',
            quantity: 2,
            price: 99.99,
            product: {
              name: 'Test Product',
              image: 'test.jpg',
            },
          },
        ],
        total: 199.98,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      cartService.getCart.mockResolvedValue(mockCart);

      await getCart(req, res);

      expect(cartService.getCart).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCart,
      });
    });

    it('should get cart for guest user', async () => {
      const mockCart = {
        sessionId: 'test-session-123',
        items: [],
        total: 0,
      };

      cartService.getGuestCart.mockResolvedValue(mockCart);

      await getCart(req, res);

      expect(cartService.getGuestCart).toHaveBeenCalledWith('test-session-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCart,
      });
    });

    it('should handle errors', async () => {
      req.user = { userId: '507f1f77bcf86cd799439011' };
      cartService.getCart.mockRejectedValue(new Error('Cart service error'));

      await getCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error fetching cart',
      });
    });
  });

  describe('addToCart', () => {
    it('should add item to cart for authenticated user', async () => {
      const cartItem = {
        productId: '507f1f77bcf86cd799439012',
        quantity: 2,
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 99.99,
        stock: 10,
        isActive: true,
      };

      const mockUpdatedCart = {
        userId: '507f1f77bcf86cd799439011',
        items: [
          {
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: mockProduct.price,
            product: mockProduct,
          },
        ],
        total: 199.98,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = cartItem;

      productService.getProductById.mockResolvedValue(mockProduct);
      cartService.addToCart.mockResolvedValue(mockUpdatedCart);

      await addToCart(req, res);

      expect(productService.getProductById).toHaveBeenCalledWith(cartItem.productId);
      expect(cartService.addToCart).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        cartItem.productId,
        cartItem.quantity,
        mockProduct.price
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item added to cart',
        data: mockUpdatedCart,
      });
    });

    it('should return error if product not found', async () => {
      const cartItem = {
        productId: '507f1f77bcf86cd799439012',
        quantity: 2,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = cartItem;

      productService.getProductById.mockResolvedValue(null);

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
    });

    it('should return error if product is inactive', async () => {
      const cartItem = {
        productId: '507f1f77bcf86cd799439012',
        quantity: 2,
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Inactive Product',
        price: 99.99,
        stock: 10,
        isActive: false,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = cartItem;

      productService.getProductById.mockResolvedValue(mockProduct);

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product is not available',
      });
    });

    it('should return error if insufficient stock', async () => {
      const cartItem = {
        productId: '507f1f77bcf86cd799439012',
        quantity: 15,
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 99.99,
        stock: 10,
        isActive: true,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = cartItem;

      productService.getProductById.mockResolvedValue(mockProduct);

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient stock available',
      });
    });

    it('should add item to guest cart', async () => {
      const cartItem = {
        productId: '507f1f77bcf86cd799439012',
        quantity: 1,
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Product',
        price: 99.99,
        stock: 10,
        isActive: true,
      };

      const mockUpdatedCart = {
        sessionId: 'test-session-123',
        items: [
          {
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: mockProduct.price,
            product: mockProduct,
          },
        ],
        total: 99.99,
      };

      req.body = cartItem;

      productService.getProductById.mockResolvedValue(mockProduct);
      cartService.addToGuestCart.mockResolvedValue(mockUpdatedCart);

      await addToCart(req, res);

      expect(cartService.addToGuestCart).toHaveBeenCalledWith(
        'test-session-123',
        cartItem.productId,
        cartItem.quantity,
        mockProduct.price
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item added to cart',
        data: mockUpdatedCart,
      });
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity', async () => {
      const productId = '507f1f77bcf86cd799439012';
      const updateData = { quantity: 3 };

      const mockUpdatedCart = {
        userId: '507f1f77bcf86cd799439011',
        items: [
          {
            productId,
            quantity: 3,
            price: 99.99,
          },
        ],
        total: 299.97,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.params = { productId };
      req.body = updateData;

      cartService.updateCartItem.mockResolvedValue(mockUpdatedCart);

      await updateCartItem(req, res);

      expect(cartService.updateCartItem).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        productId,
        updateData.quantity
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart item updated',
        data: mockUpdatedCart,
      });
    });

    it('should return error for invalid quantity', async () => {
      const productId = '507f1f77bcf86cd799439012';
      const updateData = { quantity: 0 };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.params = { productId };
      req.body = updateData;

      await updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const productId = '507f1f77bcf86cd799439012';

      const mockUpdatedCart = {
        userId: '507f1f77bcf86cd799439011',
        items: [],
        total: 0,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.params = { productId };

      cartService.removeFromCart.mockResolvedValue(mockUpdatedCart);

      await removeFromCart(req, res);

      expect(cartService.removeFromCart).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        productId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item removed from cart',
        data: mockUpdatedCart,
      });
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      req.user = { userId: '507f1f77bcf86cd799439011' };

      cartService.clearCart.mockResolvedValue({
        userId: '507f1f77bcf86cd799439011',
        items: [],
        total: 0,
      });

      await clearCart(req, res);

      expect(cartService.clearCart).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart cleared successfully',
      });
    });
  });

  describe('validateCart', () => {
    it('should validate cart successfully', async () => {
      const mockValidatedCart = {
        valid: true,
        items: [
          {
            productId: '507f1f77bcf86cd799439012',
            quantity: 2,
            price: 99.99,
            available: true,
            currentPrice: 99.99,
          },
        ],
        total: 199.98,
        issues: [],
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };

      cartService.validateCart.mockResolvedValue(mockValidatedCart);

      await validateCart(req, res);

      expect(cartService.validateCart).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidatedCart,
      });
    });

    it('should return validation issues', async () => {
      const mockValidatedCart = {
        valid: false,
        items: [
          {
            productId: '507f1f77bcf86cd799439012',
            quantity: 10,
            price: 99.99,
            available: true,
            currentPrice: 109.99,
          },
        ],
        total: 219.98,
        issues: [
          {
            productId: '507f1f77bcf86cd799439012',
            type: 'price_change',
            message: 'Product price has changed',
            oldPrice: 99.99,
            newPrice: 109.99,
          },
        ],
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };

      cartService.validateCart.mockResolvedValue(mockValidatedCart);

      await validateCart(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidatedCart,
      });
    });
  });

  describe('mergeGuestCart', () => {
    it('should merge guest cart with user cart on login', async () => {
      const guestCartData = {
        items: [
          {
            productId: '507f1f77bcf86cd799439012',
            quantity: 1,
            price: 99.99,
          },
        ],
      };

      const mockMergedCart = {
        userId: '507f1f77bcf86cd799439011',
        items: [
          {
            productId: '507f1f77bcf86cd799439012',
            quantity: 1,
            price: 99.99,
          },
        ],
        total: 99.99,
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = guestCartData;

      cartService.mergeGuestCart.mockResolvedValue(mockMergedCart);

      await mergeGuestCart(req, res);

      expect(cartService.mergeGuestCart).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        guestCartData.items
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Guest cart merged successfully',
        data: mockMergedCart,
      });
    });
  });
});