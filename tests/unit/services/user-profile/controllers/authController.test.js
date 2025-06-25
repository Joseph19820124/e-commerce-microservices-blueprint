const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  register, 
  login, 
  logout, 
  refreshToken,
  changePassword 
} = require('../../../../../services/user-profile/src/controllers/authController');
const User = require('../../../../../services/user-profile/src/models/User');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../../../services/user-profile/src/models/User');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        ...userData,
        password: hashedPassword,
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          id: '507f1f77bcf86cd799439011',
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        }),
      };

      const accessToken = 'accessToken123';
      const refreshTokenStr = 'refreshToken123';

      User.findOne.mockResolvedValue(null); // User doesn't exist
      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.mockImplementation(() => mockUser);
      jwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshTokenStr);

      req.body = userData;

      await register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { email: userData.email },
          { username: userData.username },
        ],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: expect.any(Object),
          accessToken,
        },
      });
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', refreshTokenStr, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    });

    it('should return error if user already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
      };

      const existingUser = {
        _id: '507f1f77bcf86cd799439011',
        email: userData.email,
      };

      User.findOne.mockResolvedValue(existingUser);
      req.body = userData;

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User already exists with this email or username',
      });
    });

    it('should handle validation errors', async () => {
      const userData = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        email: { message: 'Please provide a valid email' },
        password: { message: 'Password must be at least 6 characters' },
      };

      User.findOne.mockResolvedValue(null);
      const mockUser = {
        save: jest.fn().mockRejectedValue(validationError),
      };
      User.mockImplementation(() => mockUser);

      req.body = userData;

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: validationError.errors,
      });
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: loginData.email,
        password: 'hashedPassword123',
        isActive: true,
        toJSON: jest.fn().mockReturnValue({
          id: '507f1f77bcf86cd799439011',
          email: loginData.email,
          username: 'testuser',
        }),
      };

      const accessToken = 'accessToken123';
      const refreshTokenStr = 'refreshToken123';

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshTokenStr);

      req.body = loginData;

      await login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.any(Object),
          accessToken,
        },
      });
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', refreshTokenStr, expect.any(Object));
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        password: 'hashedPassword123',
        isActive: true,
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      req.body = loginData;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should return error for inactive user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        password: 'hashedPassword123',
        isActive: false,
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      req.body = loginData;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is deactivated',
      });
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      User.findOne.mockResolvedValue(null);

      req.body = loginData;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshTokenStr = 'validRefreshToken123';
      const decodedToken = {
        userId: '507f1f77bcf86cd799439011',
        type: 'refresh',
      };
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        isActive: true,
        toJSON: jest.fn().mockReturnValue({
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
        }),
      };
      const newAccessToken = 'newAccessToken123';

      req.cookies = { refreshToken: refreshTokenStr };
      jwt.verify.mockReturnValue(decodedToken);
      User.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(newAccessToken);

      await refreshToken(req, res);

      expect(jwt.verify).toHaveBeenCalledWith(refreshTokenStr, process.env.JWT_REFRESH_SECRET);
      expect(User.findById).toHaveBeenCalledWith(decodedToken.userId);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: newAccessToken,
          user: expect.any(Object),
        },
      });
    });

    it('should return error for missing refresh token', async () => {
      req.cookies = {};

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Refresh token not provided',
      });
    });

    it('should return error for invalid refresh token', async () => {
      const invalidToken = 'invalidToken123';
      const tokenError = new Error('Invalid token');

      req.cookies = { refreshToken: invalidToken };
      jwt.verify.mockImplementation(() => {
        throw tokenError;
      });

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid refresh token',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: 'hashedOldPassword',
        save: jest.fn().mockResolvedValue(true),
      };

      const newHashedPassword = 'hashedNewPassword123';

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = passwordData;

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue(newHashedPassword);

      await changePassword(req, res);

      expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(bcrypt.compare).toHaveBeenCalledWith(passwordData.currentPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
      expect(mockUser.password).toBe(newHashedPassword);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return error for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      const mockUser = {
        password: 'hashedOldPassword',
      };

      req.user = { userId: '507f1f77bcf86cd799439011' };
      req.body = passwordData;

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect',
      });
    });
  });
});