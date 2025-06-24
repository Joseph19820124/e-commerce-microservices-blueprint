const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateAddress } = require('../middleware/validation');

router.get('/', authenticateToken, requireRole(['admin']), userController.getAllUsers);
router.get('/:id', authenticateToken, userController.getUserById);
router.patch('/:id/status', authenticateToken, requireRole(['admin']), userController.updateUserStatus);

router.post('/addresses', authenticateToken, validateAddress, userController.addAddress);
router.put('/addresses/:addressId', authenticateToken, validateAddress, userController.updateAddress);
router.delete('/addresses/:addressId', authenticateToken, userController.deleteAddress);

module.exports = router;