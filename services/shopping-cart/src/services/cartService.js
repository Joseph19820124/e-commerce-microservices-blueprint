const { getClient } = require('./redisClient');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class CartService {
  constructor() {
    this.keyPrefix = 'cart:';
    this.expiry = parseInt(process.env.CART_EXPIRY) || 86400;
  }

  getCartKey(userId, sessionId = null) {
    return `${this.keyPrefix}${userId || sessionId}`;
  }

  async getCart(userId, sessionId = null) {
    try {
      const client = getClient();
      const key = this.getCartKey(userId, sessionId);
      const cartData = await client.get(key);
      
      if (!cartData) {
        return this.createEmptyCart(userId, sessionId);
      }

      const cart = JSON.parse(cartData);
      await client.expire(key, this.expiry);
      return cart;
    } catch (error) {
      logger.error('Error getting cart:', error);
      throw error;
    }
  }

  async saveCart(cart) {
    try {
      const client = getClient();
      const key = this.getCartKey(cart.userId, cart.sessionId);
      
      cart.updatedAt = new Date().toISOString();
      await client.setEx(key, this.expiry, JSON.stringify(cart));
      
      return cart;
    } catch (error) {
      logger.error('Error saving cart:', error);
      throw error;
    }
  }

  createEmptyCart(userId = null, sessionId = null) {
    return {
      id: uuidv4(),
      userId: userId || null,
      sessionId: sessionId || uuidv4(),
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async addItem(userId, sessionId, item) {
    try {
      const cart = await this.getCart(userId, sessionId);
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.productId === item.productId && 
                   JSON.stringify(cartItem.variant) === JSON.stringify(item.variant)
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += item.quantity;
        cart.items[existingItemIndex].updatedAt = new Date().toISOString();
      } else {
        cart.items.push({
          ...item,
          id: uuidv4(),
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      this.calculateTotals(cart);
      return await this.saveCart(cart);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  async updateItem(userId, sessionId, itemId, updates) {
    try {
      const cart = await this.getCart(userId, sessionId);
      const itemIndex = cart.items.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      Object.assign(cart.items[itemIndex], updates, {
        updatedAt: new Date().toISOString()
      });

      this.calculateTotals(cart);
      return await this.saveCart(cart);
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeItem(userId, sessionId, itemId) {
    try {
      const cart = await this.getCart(userId, sessionId);
      cart.items = cart.items.filter(item => item.id !== itemId);
      
      this.calculateTotals(cart);
      return await this.saveCart(cart);
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  async clearCart(userId, sessionId) {
    try {
      const cart = this.createEmptyCart(userId, sessionId);
      return await this.saveCart(cart);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  async mergeCart(userId, sessionId) {
    try {
      const client = getClient();
      const userCartKey = this.getCartKey(userId);
      const sessionCartKey = this.getCartKey(null, sessionId);

      const [userCartData, sessionCartData] = await Promise.all([
        client.get(userCartKey),
        client.get(sessionCartKey)
      ]);

      if (!sessionCartData) {
        return userCartData ? JSON.parse(userCartData) : this.createEmptyCart(userId);
      }

      const sessionCart = JSON.parse(sessionCartData);
      
      if (!userCartData) {
        sessionCart.userId = userId;
        sessionCart.sessionId = null;
        await client.del(sessionCartKey);
        return await this.saveCart(sessionCart);
      }

      const userCart = JSON.parse(userCartData);
      
      sessionCart.items.forEach(sessionItem => {
        const existingItemIndex = userCart.items.findIndex(
          userItem => userItem.productId === sessionItem.productId &&
                     JSON.stringify(userItem.variant) === JSON.stringify(sessionItem.variant)
        );

        if (existingItemIndex > -1) {
          userCart.items[existingItemIndex].quantity += sessionItem.quantity;
          userCart.items[existingItemIndex].updatedAt = new Date().toISOString();
        } else {
          userCart.items.push(sessionItem);
        }
      });

      this.calculateTotals(userCart);
      await client.del(sessionCartKey);
      return await this.saveCart(userCart);
    } catch (error) {
      logger.error('Error merging carts:', error);
      throw error;
    }
  }

  calculateTotals(cart) {
    cart.totals.subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    cart.totals.tax = cart.totals.subtotal * 0.08;
    cart.totals.shipping = cart.totals.subtotal > 50 ? 0 : 10;
    cart.totals.total = cart.totals.subtotal + cart.totals.tax + cart.totals.shipping;

    cart.totals.subtotal = Math.round(cart.totals.subtotal * 100) / 100;
    cart.totals.tax = Math.round(cart.totals.tax * 100) / 100;
    cart.totals.total = Math.round(cart.totals.total * 100) / 100;
  }

  async deleteCart(userId, sessionId) {
    try {
      const client = getClient();
      const key = this.getCartKey(userId, sessionId);
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Error deleting cart:', error);
      throw error;
    }
  }
}

module.exports = new CartService();