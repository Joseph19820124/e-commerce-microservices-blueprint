const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const validator = require('validator');
const crypto = require('crypto');

/**
 * Comprehensive security middleware for microservices
 */
class SecurityMiddleware {
  constructor(config = {}) {
    this.config = {
      cors: config.cors || {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 200
      },
      rateLimit: config.rateLimit || {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      helmet: config.helmet || {},
      ...config
    };
  }

  /**
   * Apply all security middlewares
   */
  apply(app) {
    // Basic security headers with Helmet
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          ...this.config.helmet.contentSecurityPolicy?.directives
        }
      },
      crossOriginEmbedderPolicy: false,
      ...this.config.helmet
    }));

    // CORS
    app.use(cors(this.config.cors));

    // Rate limiting
    app.use(this.getRateLimiter());

    // Body parsing security
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Data sanitization against XSS
    app.use(xss());

    // Prevent parameter pollution
    app.use(hpp({
      whitelist: ['sort', 'fields', 'page', 'limit']
    }));

    // Custom security middleware
    app.use(this.securityHeaders());
    app.use(this.requestValidation());
  }

  /**
   * Get rate limiter middleware
   */
  getRateLimiter(options = {}) {
    return rateLimit({
      ...this.config.rateLimit,
      ...options,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
      }
    });
  }

  /**
   * Strict rate limiter for auth endpoints
   */
  getAuthRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    });
  }

  /**
   * Additional security headers
   */
  securityHeaders() {
    return (req, res, next) => {
      // Remove fingerprinting headers
      res.removeHeader('X-Powered-By');
      
      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      
      // Add request ID for tracking
      req.id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-ID', req.id);
      
      next();
    };
  }

  /**
   * Request validation middleware
   */
  requestValidation() {
    return (req, res, next) => {
      // Validate common headers
      const userAgent = req.headers['user-agent'];
      if (!userAgent || userAgent.length > 500) {
        return res.status(400).json({
          error: 'Invalid user agent'
        });
      }

      // Validate content type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
          return res.status(400).json({
            error: 'Content-Type must be application/json'
          });
        }
      }

      // Validate request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 10 * 1024 * 1024) { // 10MB
        return res.status(413).json({
          error: 'Request entity too large'
        });
      }

      next();
    };
  }

  /**
   * Input validation utilities
   */
  static validators = {
    /**
     * Validate email
     */
    isEmail(email) {
      return validator.isEmail(email);
    },

    /**
     * Validate MongoDB ObjectId
     */
    isMongoId(id) {
      return validator.isMongoId(id);
    },

    /**
     * Validate URL
     */
    isURL(url, options = {}) {
      return validator.isURL(url, {
        protocols: ['http', 'https'],
        require_protocol: true,
        ...options
      });
    },

    /**
     * Validate and sanitize string
     */
    sanitizeString(str, options = {}) {
      if (typeof str !== 'string') return '';
      
      let sanitized = str.trim();
      
      if (options.lowercase) {
        sanitized = sanitized.toLowerCase();
      }
      
      if (options.uppercase) {
        sanitized = sanitized.toUpperCase();
      }
      
      if (options.escape) {
        sanitized = validator.escape(sanitized);
      }
      
      if (options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
      }
      
      return sanitized;
    },

    /**
     * Validate phone number
     */
    isPhoneNumber(phone) {
      return validator.isMobilePhone(phone, 'any');
    },

    /**
     * Validate credit card
     */
    isCreditCard(card) {
      return validator.isCreditCard(card);
    },

    /**
     * Validate strong password
     */
    isStrongPassword(password) {
      return validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      });
    },

    /**
     * Validate date
     */
    isDate(date) {
      return validator.isISO8601(date);
    },

    /**
     * Validate numeric range
     */
    isInRange(value, min, max) {
      const num = parseFloat(value);
      return !isNaN(num) && num >= min && num <= max;
    },

    /**
     * Sanitize HTML
     */
    sanitizeHTML(html) {
      return validator.escape(html);
    },

    /**
     * Validate alphanumeric
     */
    isAlphanumeric(str) {
      return validator.isAlphanumeric(str);
    },

    /**
     * Validate UUID
     */
    isUUID(str, version = 4) {
      return validator.isUUID(str, version);
    }
  };

  /**
   * SQL injection prevention middleware
   */
  sqlInjectionProtection() {
    const sqlPatterns = [
      /(\b)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript)(\b)/gi,
      /(;|--|\/\*|\*\/|xp_|sp_|0x)/gi,
      /(<|>|'|"|;|&|\\)/g
    ];

    return (req, res, next) => {
      const checkValue = (value) => {
        if (typeof value === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
        }
        return true;
      };

      const checkObject = (obj) => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
              if (!checkObject(value)) return false;
            } else if (!checkValue(value)) {
              return false;
            }
          }
        }
        return true;
      };

      // Check query parameters
      if (!checkObject(req.query)) {
        return res.status(400).json({
          error: 'Invalid query parameters detected'
        });
      }

      // Check body
      if (req.body && !checkObject(req.body)) {
        return res.status(400).json({
          error: 'Invalid request body detected'
        });
      }

      // Check params
      if (!checkObject(req.params)) {
        return res.status(400).json({
          error: 'Invalid URL parameters detected'
        });
      }

      next();
    };
  }

  /**
   * File upload validation
   */
  fileUploadValidation(options = {}) {
    const defaults = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    };

    const config = { ...defaults, ...options };

    return (req, res, next) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return next();
      }

      for (const file of Object.values(req.files)) {
        // Check file size
        if (file.size > config.maxSize) {
          return res.status(400).json({
            error: `File size exceeds maximum allowed size of ${config.maxSize / 1024 / 1024}MB`
          });
        }

        // Check file type
        if (!config.allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'File type not allowed'
          });
        }

        // Check file extension
        const ext = path.extname(file.name).toLowerCase();
        if (!config.allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'File extension not allowed'
          });
        }

        // Additional security checks
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
          return res.status(400).json({
            error: 'Invalid file name'
          });
        }
      }

      next();
    };
  }

  /**
   * API key validation middleware
   */
  apiKeyValidation() {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required'
        });
      }

      // Validate API key format
      if (!validator.isAlphanumeric(apiKey) || apiKey.length !== 32) {
        return res.status(401).json({
          error: 'Invalid API key format'
        });
      }

      // Here you would typically validate against database
      req.apiKey = apiKey;
      next();
    };
  }
}

module.exports = SecurityMiddleware;