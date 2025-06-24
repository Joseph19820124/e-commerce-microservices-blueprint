const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product(req.body);
    await product.save();
    
    logger.info(`Product created: ${product._id}`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      sort = '-createdAt',
      status = 'active'
    } = req.query;

    const query = { status };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (brand) query.brand = brand;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .limit(Number(limit))
        .skip(skip),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    logger.info(`Product updated: ${product._id}`);
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    logger.info(`Product soft deleted: ${product._id}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(
      { $text: { $search: q }, status: 'active' },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(Number(limit))
      .skip(skip);

    res.json({
      success: true,
      data: products,
      query: q
    });
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { 
        stock,
        status: stock > 0 ? 'active' : 'out-of-stock'
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    logger.info(`Product stock updated: ${product._id}, new stock: ${stock}`);
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};