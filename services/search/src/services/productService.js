const axios = require('axios');
const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.baseURL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
  }

  async getAllProducts(page = 1, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/api/products`, {
        params: { page, limit, status: 'active' }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching products from product service:', error.message);
      throw error;
    }
  }

  async getProduct(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/products/${productId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching product ${productId}:`, error.message);
      throw error;
    }
  }

  async syncAllProducts() {
    try {
      let page = 1;
      const limit = 100;
      let allProducts = [];
      let hasMore = true;

      while (hasMore) {
        const response = await this.getAllProducts(page, limit);
        allProducts = allProducts.concat(response.data);
        
        hasMore = page < response.pagination.pages;
        page++;
      }

      logger.info(`Fetched ${allProducts.length} products for sync`);
      return allProducts;
    } catch (error) {
      logger.error('Error syncing products:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();