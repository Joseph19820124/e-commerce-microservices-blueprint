const { query } = require('express-validator');

exports.validateSearch = [
  query('q').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('minRating').optional().isFloat({ min: 0, max: 5 }),
  query('sort').optional().isIn([
    '_score:desc', '_score:asc',
    'price:desc', 'price:asc',
    'rating:desc', 'rating:asc',
    'name:desc', 'name:asc',
    'created:desc', 'created:asc'
  ])
];

exports.validateAutocomplete = [
  query('q').notEmpty().isString().trim().isLength({ min: 2, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 20 })
];