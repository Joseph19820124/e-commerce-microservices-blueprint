const axios = require('axios');
const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.baseURL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
  }

  async getProduct(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/products/${productId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching product ${productId}:`, error.message);
      if (error.response?.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error('Product service unavailable');
    }
  }

  async validateProducts(items) {
    try {
      const productIds = [...new Set(items.map(item => item.productId))];
      const products = await Promise.all(
        productIds.map(id => this.getProduct(id).catch(() => null))
      );

      const productMap = new Map();
      products.forEach(product => {
        if (product) {
          productMap.set(product._id, product);
        }
      });

      const validatedItems = [];
      const errors = [];

      items.forEach(item => {
        const product = productMap.get(item.productId);
        
        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          return;
        }

        if (!product.isInStock || product.status !== 'active') {
          errors.push(`Product ${product.name} is not available`);
          return;
        }

        if (product.stock < item.quantity) {
          errors.push(`Product ${product.name} has insufficient stock. Available: ${product.stock}`);
          return;
        }

        validatedItems.push({
          ...item,
          name: product.name,
          price: product.price,
          image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
          maxStock: product.stock
        });
      });

      return {
        validatedItems,
        errors
      };
    } catch (error) {
      logger.error('Error validating products:', error);
      throw error;
    }
  }

  async checkStock(productId, quantity) {
    try {
      const product = await this.getProduct(productId);
      return {
        available: product.stock >= quantity,
        currentStock: product.stock,
        requestedQuantity: quantity
      };
    } catch (error) {
      logger.error(`Error checking stock for product ${productId}:`, error);
      throw error;
    }
  }
}

module.exports = new ProductService();