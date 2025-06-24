const searchService = require('../services/searchService');
const productService = require('../services/productService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.search = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      q,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      page = 1,
      limit = 20,
      sort = '_score:desc'
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (subcategory) filters.subcategory = subcategory;
    if (brand) filters.brand = Array.isArray(brand) ? brand : [brand];
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (minRating) filters.minRating = minRating;
    if (inStock === 'true') filters.inStock = true;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort
    };

    const results = await searchService.search(q, filters, options);

    logger.info(`Search performed: "${q}" - ${results.total} results`);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.autocomplete = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await searchService.autocomplete(q, parseInt(limit));
    res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reindex = async (req, res) => {
  try {
    logger.info('Starting product reindexing...');
    
    const products = await productService.syncAllProducts();
    await searchService.bulkIndex(products);

    logger.info('Product reindexing completed');
    res.json({ 
      success: true, 
      message: `Reindexed ${products.length} products`,
      count: products.length
    });
  } catch (error) {
    logger.error('Reindex error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.indexProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await productService.getProduct(productId);
    await searchService.indexProduct(product);

    logger.info(`Product ${productId} indexed successfully`);
    res.json({ 
      success: true, 
      message: 'Product indexed successfully',
      productId
    });
  } catch (error) {
    logger.error('Index product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await productService.getProduct(productId);
    await searchService.updateProduct(productId, product);

    logger.info(`Product ${productId} updated in search index`);
    res.json({ 
      success: true, 
      message: 'Product updated in search index',
      productId
    });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    await searchService.deleteProduct(productId);

    logger.info(`Product ${productId} deleted from search index`);
    res.json({ 
      success: true, 
      message: 'Product deleted from search index',
      productId
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAggregations = async (req, res) => {
  try {
    const results = await searchService.search('', {}, { limit: 0 });
    res.json({ 
      success: true, 
      data: results.aggregations 
    });
  } catch (error) {
    logger.error('Get aggregations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};