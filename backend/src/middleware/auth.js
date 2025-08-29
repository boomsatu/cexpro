const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cache, session } = require('../config/redis');
const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    kycLevel: user.kycLevel,
    twoFactorEnabled: user.twoFactorEnabled
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'cex-exchange',
    audience: 'cex-users'
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'cex-exchange',
      audience: 'cex-users'
    }
  );

  return { accessToken, refreshToken };
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'cex-exchange',
      audience: 'cex-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Extract token from request
const extractToken = (req) => {
  let token = null;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  // Check cookies
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Check query parameter (for WebSocket connections)
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  return token;
};

// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return await cache.exists(`blacklist:${tokenHash}`);
};

// Blacklist token
const blacklistToken = async (token, expiresIn = 900) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await cache.set(`blacklist:${tokenHash}`, true, expiresIn);
};

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if it's a refresh token (shouldn't be used for API access)
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get user from database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
        status: user.status
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(401).json({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Update last activity in session
    if (req.session) {
      req.session.lastActivity = new Date();
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findByPk(decoded.id);
    if (user && user.status === 'active' && !user.isLocked()) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        current: userRoles
      });
    }

    next();
  };
};

// KYC level requirement
const requireKYCLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.kycLevel < minLevel) {
      return res.status(403).json({
        error: 'Higher KYC level required',
        code: 'KYC_LEVEL_REQUIRED',
        required: minLevel,
        current: req.user.kycLevel
      });
    }

    next();
  };
};

// 2FA requirement
const require2FA = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.twoFactorEnabled) {
    return res.status(403).json({
      error: '2FA is required for this action',
      code: 'TWO_FA_REQUIRED'
    });
  }

  // Check if 2FA was verified in this session
  if (!req.session || !req.session.twoFactorVerified) {
    return res.status(403).json({
      error: '2FA verification required',
      code: 'TWO_FA_VERIFICATION_REQUIRED'
    });
  }

  next();
};

// Email verification requirement
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }

  next();
};

// Rate limiting per user
const userRateLimit = (maxRequests, windowMs) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const key = `rate_limit:user:${req.user.id}:${req.route.path}`;
    const current = await cache.incr(key);

    if (current === 1) {
      await cache.expire(key, Math.ceil(windowMs / 1000));
    }

    if (current > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: await cache.ttl(key)
      });
    }

    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    res.set('X-RateLimit-Reset', new Date(Date.now() + (await cache.ttl(key) * 1000)));

    next();
  };
};

// Session-based authentication (for admin panel)
const requireSession = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: 'Session required',
        code: 'SESSION_REQUIRED'
      });
    }

    // Get user from database
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check user status
    if (user.status !== 'active') {
      req.session.destroy();
      return res.status(401).json({
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Session auth error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = {
  generateTokens,
  verifyToken,
  extractToken,
  blacklistToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireKYCLevel,
  require2FA,
  requireEmailVerification,
  requireSession,
  userRateLimit
};