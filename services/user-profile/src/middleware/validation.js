const { body } = require('express-validator');

exports.validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().isLength({ min: 2, max: 50 }),
  body('lastName').notEmpty().trim().isLength({ min: 2, max: 50 })
];

exports.validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

exports.validatePasswordChange = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

exports.validateProfileUpdate = [
  body('profile.firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('profile.lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('profile.phone').optional().isMobilePhone(),
  body('profile.dateOfBirth').optional().isISO8601()
];

exports.validateAddress = [
  body('street').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('state').notEmpty().trim(),
  body('zipCode').notEmpty().trim(),
  body('country').notEmpty().trim(),
  body('type').isIn(['shipping', 'billing', 'both'])
];