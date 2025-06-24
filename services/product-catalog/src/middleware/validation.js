const { body } = require('express-validator');

exports.validateProduct = [
  body('name').notEmpty().trim().isLength({ min: 3, max: 200 }),
  body('description').notEmpty().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty().trim(),
  body('subcategory').notEmpty().trim(),
  body('brand').notEmpty().trim(),
  body('sku').notEmpty().trim(),
  body('stock').isInt({ min: 0 })
];

exports.validateProductUpdate = [
  body('name').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim(),
  body('subcategory').optional().trim(),
  body('brand').optional().trim(),
  body('sku').optional().trim(),
  body('stock').optional().isInt({ min: 0 })
];