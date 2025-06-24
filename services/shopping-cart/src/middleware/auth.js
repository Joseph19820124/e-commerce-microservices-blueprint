const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../utils/logger');

exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
      const response = await axios.get(`${userServiceUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        req.user = {
          userId: response.data.user._id,
          email: response.data.user.email,
          role: response.data.user.role
        };
      }
    } catch (error) {
      logger.warn('Invalid token provided:', error.message);
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next();
  }
};

exports.requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
      const response = await axios.get(`${userServiceUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      req.user = {
        userId: response.data.user._id,
        email: response.data.user.email,
        role: response.data.user.role
      };

      next();
    } catch (error) {
      logger.error('Token validation error:', error);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};