const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validatePasswordChange,
  validateProfileUpdate
} = require('../middleware/validation');

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, authController.updateProfile);
router.post('/change-password', authenticateToken, validatePasswordChange, authController.changePassword);
router.post('/refresh-token', authenticateToken, authController.refreshToken);

module.exports = router;