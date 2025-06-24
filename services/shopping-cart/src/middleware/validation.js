const { body } = require('express-validator');

exports.validateAddToCart = [
  body('productId').notEmpty().isMongoId().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  body('variant').optional().isObject()
];

exports.validateUpdateCartItem = [
  body('quantity').optional().isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100')
];