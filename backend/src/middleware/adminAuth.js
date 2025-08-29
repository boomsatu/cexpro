const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Admin } = require('../models');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for admin login
const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware to verify admin JWT token
 */
const verifyAdminToken = async (req, res, next) => {
  try {
    console.log('🔐 verifyAdminToken middleware called for:', req.originalUrl);
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is for admin
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin token required.',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get admin from database
    const admin = await Admin.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'status', 'lastLogin']
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Admin not found.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Add admin info to request
    req.admin = admin;
    next();
  } catch (error) {
    logger.error('Admin token verification failed:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Token verification failed.',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
};

/**
 * Middleware to check admin role permissions
 */
const requireAdminRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // If no specific roles required, any authenticated admin can access
    if (allowedRoles.length === 0) {
      return next();
    }

    // Check if admin has required role
    if (!allowedRoles.includes(req.admin.role)) {
      logger.warn(`Admin ${req.admin.username} attempted to access restricted resource. Required roles: ${allowedRoles.join(', ')}, Admin role: ${req.admin.role}`);
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        current_role: req.admin.role
      });
    }

    next();
  };
};

/**
 * Middleware to log admin activities
 */
const logAdminActivity = (req, res, next) => {
  res.on('finish', () => {
    // Log admin activity after response is sent
    const adminId = req.admin?.id;
    const action = `${req.method} ${req.originalUrl}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // You can implement actual logging to database here
    console.log(`Admin Activity: ${adminId} performed ${action} from ${ipAddress}`);
  });
  next();
};

/**
 * Generate admin JWT token
 */
const generateAdminToken = (admin) => {
  const payload = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    type: 'admin'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h'
  });
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Validate admin credentials
 */
const validateAdminCredentials = async (username, password) => {
  try {
    logger.info('Validating admin credentials for:', username);
    
    // Find admin by email
    const admin = await Admin.findOne({
      where: {
        email: username
      }
    });

    if (!admin) {
      logger.warn('Admin not found for email:', username);
      return { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
    }

    logger.info('Admin found:', { id: admin.id, email: admin.email, status: admin.status });

    if (admin.status !== 'active') {
      logger.warn('Admin account not active:', admin.status);
      return { success: false, error: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' };
    }

    // Use the model's comparePassword method instead of direct bcrypt.compare
    logger.info('Comparing password using model method...');
    const isValidPassword = await admin.comparePassword(password);
    logger.info(`Password comparison result: ${isValidPassword}`);
    
    if (!isValidPassword) {
      logger.warn('Password validation failed');
      return { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
    }

    logger.info('Admin credentials validated successfully');

    // Update last login using updateLastLogin method to avoid triggering beforeUpdate hook
    await admin.updateLastLogin();

    return {
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        last_login: admin.lastLogin
      }
    };
  } catch (error) {
    logger.error('Admin credential validation failed:', error);
    return { success: false, error: 'Authentication failed', code: 'AUTH_FAILED' };
  }
};

module.exports = {
  adminRateLimit,
  adminLoginRateLimit,
  verifyAdminToken,
  requireAdminRole,
  logAdminActivity,
  generateAdminToken,
  hashPassword,
  comparePassword,
  validateAdminCredentials
};