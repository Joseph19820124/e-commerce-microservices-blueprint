const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { validateAddToCart, validateUpdateCartItem } = require('../middleware/validation');

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, validateAddToCart, cartController.addToCart);
router.put('/items/:itemId', optionalAuth, validateUpdateCartItem, cartController.updateCartItem);
router.delete('/items/:itemId', optionalAuth, cartController.removeFromCart);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/merge', requireAuth, cartController.mergeCart);
router.get('/validate', optionalAuth, cartController.validateCart);

module.exports = router;