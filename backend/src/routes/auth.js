const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { generateTokens, verifyToken, blacklistToken, requireAuth, optionalAuth } = require('../middleware/auth');
const { cache, session } = require('../config/redis');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const auditLogger = require('../services/auditLogger');

const router = express.Router();

// Rate limiting for auth endpoints - DISABLED FOR DEVELOPMENT
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     error: 'Too many authentication attempts, please try again later.',
//     code: 'AUTH_RATE_LIMIT_EXCEEDED'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const registerLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 registration attempts per hour
//   message: {
//     error: 'Too many registration attempts, please try again later.',
//     code: 'REGISTER_RATE_LIMIT_EXCEEDED'
//   }
// });

// Validation middleware
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .isAlphanumeric()
    .withMessage('Username must be 3-30 alphanumeric characters'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('First name is required (1-50 characters)'),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Last name is required (1-50 characters)'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be 2 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid date of birth is required'),
  body('termsAccepted')
    .equals('true')
    .withMessage('Terms and conditions must be accepted')
];

const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits')
];

const validate2FA = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Register endpoint
router.post('/register', validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      country
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        code: 'USER_EXISTS',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }

    // Create new user
    const user = await User.create({
      email,
      username,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      country
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken, {
      firstName: user.firstName,
      username: user.username
    });

    // Log registration
    await auditLogger.log({
      action: 'USER_REGISTER',
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        email: user.email,
        username: user.username
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status
      },
      nextStep: 'EMAIL_VERIFICATION'
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login endpoint
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { identifier, password, twoFactorCode, rememberMe } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      await auditLogger.log({
        action: 'LOGIN_ATTEMPT_LOCKED',
        userId: user.id,
        ip,
        userAgent,
        success: false
      });

      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      
      await auditLogger.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        ip,
        userAgent,
        success: false,
        reason: 'INVALID_PASSWORD'
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check account status
    if (user.status !== 'active') {
      await auditLogger.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        ip,
        userAgent,
        success: false,
        reason: 'ACCOUNT_INACTIVE'
      });

      return res.status(401).json({
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
        status: user.status
      });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          message: '2FA code required',
          code: 'TWO_FA_REQUIRED',
          tempToken: jwt.sign(
            { userId: user.id, step: '2fa' },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
          )
        });
      }

      // Verify 2FA code
      const is2FAValid = user.verify2FA(twoFactorCode) || await user.useBackupCode(twoFactorCode);
      if (!is2FAValid) {
        await user.incLoginAttempts();
        
        await auditLogger.log({
          action: 'LOGIN_FAILED',
          userId: user.id,
          ip,
          userAgent,
          success: false,
          reason: 'INVALID_2FA'
        });

        return res.status(401).json({
          error: 'Invalid 2FA code',
          code: 'INVALID_2FA_CODE'
        });
      }
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login info
    await user.update({
      lastLoginAt: new Date(),
      lastLoginIp: ip
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Create session
    const sessionId = crypto.randomUUID();
    await session.create(sessionId, user.id, {
      ip,
      userAgent,
      twoFactorVerified: user.twoFactorEnabled
    });

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.cookie('sessionId', sessionId, cookieOptions);

    // Log successful login
    await auditLogger.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      ip,
      userAgent,
      success: true
    });

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      },
      sessionId
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { token, user } = req;
    const { allDevices } = req.body;

    // Blacklist current token
    await blacklistToken(token);

    // Destroy session
    if (req.cookies.sessionId) {
      await session.destroy(req.cookies.sessionId);
    }

    // If logout from all devices, destroy all user sessions
    if (allDevices) {
      await session.destroyAllUserSessions(user.id);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    // Log logout
    await auditLogger.log({
      action: 'LOGOUT',
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: { allDevices }
    });

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    let refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    };

    res.cookie('accessToken', tokens.accessToken, cookieOptions);
    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
});

// Email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Update user
    await user.update({
      emailVerified: true,
      status: 'active',
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Log email verification
    await auditLogger.log({
      action: 'EMAIL_VERIFIED',
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Email verified successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        message: 'If the email exists, a verification email has been sent'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email is already verified',
        code: 'EMAIL_ALREADY_VERIFIED'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken, {
      firstName: user.firstName,
      username: user.username
    });

    res.json({
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to send verification email',
      code: 'VERIFICATION_SEND_ERROR'
    });
  }
});

module.exports = router;