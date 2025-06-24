const path = require('path');
const sharp = require('sharp');
const Product = require('../models/Product');
const logger = require('../utils/logger');

exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const filename = `${productId}-${Date.now()}.webp`;
    const outputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);

    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = path.join(process.env.UPLOAD_PATH || './uploads', thumbnailFilename);

    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    const imageData = {
      url: `/uploads/${filename}`,
      thumbnail: `/uploads/${thumbnailFilename}`,
      alt: req.body.alt || product.name,
      isPrimary: product.images.length === 0 || req.body.isPrimary === 'true'
    };

    if (imageData.isPrimary) {
      product.images.forEach(img => img.isPrimary = false);
    }

    product.images.push(imageData);
    await product.save();

    logger.info(`Image uploaded for product: ${productId}`);
    res.json({ success: true, data: imageData });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    product.images = product.images.filter(img => img._id.toString() !== imageId);
    await product.save();

    logger.info(`Image deleted from product: ${productId}`);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};