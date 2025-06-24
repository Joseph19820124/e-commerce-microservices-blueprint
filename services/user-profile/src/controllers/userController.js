const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort('-createdAt')
        .limit(Number(limit))
        .skip(skip),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    logger.info(`User status updated: ${user.email} -> ${status}`);
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newAddress = req.body;
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(newAddress);
    await user.save();

    logger.info(`Address added for user: ${user.email}`);
    res.status(201).json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Add address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    Object.assign(address, req.body);

    if (req.body.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.addressId) {
          addr.isDefault = false;
        }
      });
    }

    await user.save();

    logger.info(`Address updated for user: ${user.email}`);
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Update address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.addresses = user.addresses.filter(
      addr => addr._id.toString() !== req.params.addressId
    );

    await user.save();

    logger.info(`Address deleted for user: ${user.email}`);
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Delete address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};