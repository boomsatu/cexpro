const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireEmailVerification, userRateLimit } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword,
  enable2FA,
  verify2FASetup,
  disable2FA,
  getSessions,
  revokeSession,
  revokeAllSessions
} = require('../controllers/userController');

const router = express.Router();

// Rate limiting for sensitive operations
const sensitiveOperationsLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many sensitive operations. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordChangeLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password changes per hour
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const twoFALimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 2FA attempts per window
  message: {
    success: false,
    message: 'Too many 2FA attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Profile routes
router.get('/profile', 
  requireAuth,
  userRateLimit,
  getProfile
);

router.put('/profile',
  requireAuth,
  requireEmailVerification,
  userRateLimit,
  [
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date')
      .custom((value) => {
        const dob = new Date(value);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 18);
        
        if (dob > minAge) {
          throw new Error('You must be at least 18 years old');
        }
        
        const maxAge = new Date();
        maxAge.setFullYear(maxAge.getFullYear() - 120);
        
        if (dob < maxAge) {
          throw new Error('Invalid date of birth');
        }
        
        return true;
      }),
    
    body('phoneNumber')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Phone number must be in international format'),
    
    body('country')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country must be a 2-letter ISO country code')
      .isAlpha()
      .withMessage('Country code must contain only letters'),
    
    body('address')
      .optional()
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be between 5 and 200 characters'),
    
    body('city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('City must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('City can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('postalCode')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9\s-]+$/)
      .withMessage('Postal code can only contain letters, numbers, spaces, and hyphens')
  ],
  handleValidationErrors,
  updateProfile
);

// Password management
router.put('/password',
  requireAuth,
  requireEmailVerification,
  passwordChangeLimit,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      })
  ],
  handleValidationErrors,
  changePassword
);

// Two-Factor Authentication routes
router.post('/2fa/enable',
  requireAuth,
  requireEmailVerification,
  sensitiveOperationsLimit,
  enable2FA
);

router.post('/2fa/verify',
  requireAuth,
  requireEmailVerification,
  twoFALimit,
  [
    body('token')
      .matches(/^\d{6}$/)
      .withMessage('2FA token must be a 6-digit number')
  ],
  handleValidationErrors,
  verify2FASetup
);

router.post('/2fa/disable',
  requireAuth,
  requireEmailVerification,
  sensitiveOperationsLimit,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required to disable 2FA'),
    
    body('token')
      .optional()
      .matches(/^\d{6}$/)
      .withMessage('2FA token must be a 6-digit number')
  ],
  handleValidationErrors,
  disable2FA
);

// Session management
router.get('/sessions',
  requireAuth,
  userRateLimit,
  getSessions
);

router.delete('/sessions/:sessionId',
  requireAuth,
  sensitiveOperationsLimit,
  [
    param('sessionId')
      .isLength({ min: 1 })
      .withMessage('Session ID is required')
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('Invalid session ID format')
  ],
  handleValidationErrors,
  revokeSession
);

router.delete('/sessions',
  requireAuth,
  sensitiveOperationsLimit,
  revokeAllSessions
);

// Account security endpoints
router.get('/security/activity',
  requireAuth,
  userRateLimit,
  async (req, res) => {
    try {
      const { getUserActivitySummary } = require('../services/auditService');
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;
      
      if (days > 365) {
        return res.status(400).json({
          success: false,
          message: 'Maximum activity period is 365 days'
        });
      }
      
      const activity = await getUserActivitySummary(userId, days);
      
      res.json({
        success: true,
        data: {
          period: `${days} days`,
          activity
        }
      });
    } catch (error) {
      console.error('Get security activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

router.get('/security/suspicious',
  requireAuth,
  userRateLimit,
  async (req, res) => {
    try {
      const { detectSuspiciousActivity } = require('../services/auditService');
      const userId = req.user.id;
      
      const suspiciousPatterns = await detectSuspiciousActivity(userId);
      
      res.json({
        success: true,
        data: {
          patterns: suspiciousPatterns,
          riskLevel: suspiciousPatterns.length > 0 ? 
            Math.max(...suspiciousPatterns.map(p => 
              p.severity === 'critical' ? 4 : 
              p.severity === 'high' ? 3 : 
              p.severity === 'medium' ? 2 : 1
            )) : 0
        }
      });
    } catch (error) {
      console.error('Get suspicious activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Account preferences
router.get('/preferences',
  requireAuth,
  userRateLimit,
  async (req, res) => {
    try {
      const { cache } = require('../config/redis');
      const userId = req.user.id;
      
      // Get user preferences from cache or database
      const cacheKey = `user_preferences:${userId}`;
      let preferences = await cache.get(cacheKey);
      
      if (!preferences) {
        // Default preferences
        preferences = {
          notifications: {
            email: {
              loginAlerts: true,
              tradingUpdates: true,
              securityAlerts: true,
              marketingEmails: false,
              newsletter: false
            },
            push: {
              loginAlerts: true,
              tradingUpdates: false,
              priceAlerts: false
            }
          },
          trading: {
            defaultOrderType: 'limit',
            confirmOrders: true,
            showAdvancedOptions: false
          },
          security: {
            sessionTimeout: 30, // minutes
            requirePasswordForSensitiveOps: true,
            loginNotifications: true
          },
          display: {
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            currency: 'USD'
          }
        };
        
        // Cache for 1 hour
        await cache.setex(cacheKey, 3600, JSON.stringify(preferences));
      } else {
        preferences = JSON.parse(preferences);
      }
      
      res.json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

router.put('/preferences',
  requireAuth,
  requireEmailVerification,
  userRateLimit,
  [
    body('preferences')
      .isObject()
      .withMessage('Preferences must be an object'),
    
    body('preferences.notifications.email.loginAlerts')
      .optional()
      .isBoolean()
      .withMessage('Login alerts preference must be boolean'),
    
    body('preferences.display.theme')
      .optional()
      .isIn(['light', 'dark'])
      .withMessage('Theme must be light or dark'),
    
    body('preferences.display.language')
      .optional()
      .isIn(['en', 'id', 'zh', 'ja', 'ko'])
      .withMessage('Unsupported language'),
    
    body('preferences.security.sessionTimeout')
      .optional()
      .isInt({ min: 5, max: 480 })
      .withMessage('Session timeout must be between 5 and 480 minutes')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { cache } = require('../config/redis');
      const { createAuditLog, EVENT_TYPES, LOG_LEVELS, RISK_LEVELS } = require('../services/auditService');
      const userId = req.user.id;
      const { preferences } = req.body;
      
      // Update preferences in cache
      const cacheKey = `user_preferences:${userId}`;
      await cache.setex(cacheKey, 3600, JSON.stringify(preferences));
      
      // Log preference update
      await createAuditLog({
        userId,
        eventType: EVENT_TYPES.PROFILE_UPDATED,
        level: LOG_LEVELS.INFO,
        riskLevel: RISK_LEVELS.LOW,
        description: 'User preferences updated',
        metadata: { updatedPreferences: Object.keys(preferences) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      });
      
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences }
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Account deletion (soft delete)
router.delete('/account',
  requireAuth,
  requireEmailVerification,
  sensitiveOperationsLimit,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required for account deletion'),
    
    body('confirmation')
      .equals('DELETE MY ACCOUNT')
      .withMessage('Please type "DELETE MY ACCOUNT" to confirm'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { User } = require('../models/User');
      const { createAuditLog, EVENT_TYPES, LOG_LEVELS, RISK_LEVELS } = require('../services/auditService');
      const userId = req.user.id;
      const { password, reason } = req.body;
      
      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }
      
      // Soft delete user account
      await User.update(
        {
          status: 'deleted',
          deletedAt: new Date(),
          deletionReason: reason || 'User requested account deletion'
        },
        { where: { id: userId } }
      );
      
      // Log account deletion
      await createAuditLog({
        userId,
        eventType: 'account_deleted',
        level: LOG_LEVELS.WARNING,
        riskLevel: RISK_LEVELS.HIGH,
        description: 'User account deleted',
        metadata: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      });
      
      // Destroy session
      req.session.destroy();
      
      res.json({
        success: true,
        message: 'Account deleted successfully. We\'re sorry to see you go.'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;