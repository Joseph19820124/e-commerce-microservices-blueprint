const cartService = require('../services/cartService');
const productService = require('../services/productService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.getCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];

    if (!userId && !sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID or session ID required' 
      });
    }

    const cart = await cartService.getCart(userId, sessionId);
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error getting cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];
    const { productId, quantity, variant = {} } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID or session ID required' 
      });
    }

    const stockCheck = await productService.checkStock(productId, quantity);
    if (!stockCheck.available) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        details: stockCheck
      });
    }

    const product = await productService.getProduct(productId);
    const item = {
      productId,
      name: product.name,
      price: product.price,
      quantity,
      variant,
      image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url
    };

    const cart = await cartService.addItem(userId, sessionId, item);
    
    logger.info(`Item added to cart: ${productId} x${quantity} for user/session: ${userId || sessionId}`);
    res.status(201).json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error adding to cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];
    const { itemId } = req.params;
    const updates = req.body;

    if (updates.quantity) {
      const cart = await cartService.getCart(userId, sessionId);
      const item = cart.items.find(item => item.id === itemId);
      
      if (item) {
        const stockCheck = await productService.checkStock(item.productId, updates.quantity);
        if (!stockCheck.available) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient stock',
            details: stockCheck
          });
        }
      }
    }

    const cart = await cartService.updateItem(userId, sessionId, itemId, updates);
    
    logger.info(`Cart item updated: ${itemId} for user/session: ${userId || sessionId}`);
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error updating cart item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];
    const { itemId } = req.params;

    const cart = await cartService.removeItem(userId, sessionId, itemId);
    
    logger.info(`Item removed from cart: ${itemId} for user/session: ${userId || sessionId}`);
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error removing from cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];

    const cart = await cartService.clearCart(userId, sessionId);
    
    logger.info(`Cart cleared for user/session: ${userId || sessionId}`);
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error clearing cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.mergeCart = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const userId = req.user.userId;
    const sessionId = req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID required for cart merge' 
      });
    }

    const cart = await cartService.mergeCart(userId, sessionId);
    
    logger.info(`Cart merged for user: ${userId} from session: ${sessionId}`);
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error merging cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.validateCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];

    const cart = await cartService.getCart(userId, sessionId);
    
    if (cart.items.length === 0) {
      return res.json({ 
        success: true, 
        valid: true, 
        data: cart 
      });
    }

    const { validatedItems, errors } = await productService.validateProducts(cart.items);
    
    if (errors.length > 0) {
      return res.json({
        success: true,
        valid: false,
        data: cart,
        errors
      });
    }

    cart.items = validatedItems;
    cartService.calculateTotals(cart);
    await cartService.saveCart(cart);

    res.json({ 
      success: true, 
      valid: true, 
      data: cart 
    });
  } catch (error) {
    logger.error('Error validating cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};