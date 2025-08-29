const { body, param, query } = require('express-validator');

/**
 * Admin login validation
 */
const validateAdminLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

/**
 * Admin profile update validation
 */
const validateAdminProfileUpdate = [
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Admin password change validation
 */
const validateAdminPasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * User data update validation
 */
const validateUserUpdate = [
  (req, res, next) => {
    console.log('validateUserUpdate middleware called');
    console.log('Request params:', JSON.stringify(req.params, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    next();
  },
  param('id')
    .custom((value) => {
      console.log('Validating ID:', value);
      // Check if it's a UUID or integer
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      const isInt = /^\d+$/.test(value);
      
      console.log('Is UUID:', isUUID, 'Is Int:', isInt);
      if (!isUUID && !isInt) {
        console.log('ID validation failed');
        throw new Error('Valid user ID is required (UUID or integer)');
      }
      console.log('ID validation passed');
      return true;
    }),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter country code')
    .isAlpha()
    .withMessage('Country must contain only letters'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator', 'support'])
    .withMessage('Role must be one of: user, admin, moderator, support'),
  
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'pending'])
    .withMessage('Status must be one of: active, suspended, pending'),
  
  body('kycStatus')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('KYC status must be one of: pending, approved, rejected')
];

/**
 * User status update validation
 */
const validateUserStatusUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('is_active')
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

/**
 * KYC status update validation
 */
const validateKYCStatusUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('status')
    .isIn(['pending', 'verified', 'rejected'])
    .withMessage('Status must be one of: pending, verified, rejected'),
  
  body('level')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('Level must be between 1 and 3'),
  
  body('rejection_reason')
    .if(body('status').equals('rejected'))
    .notEmpty()
    .withMessage('Rejection reason is required when status is rejected')
    .isLength({ max: 1000 })
    .withMessage('Rejection reason cannot exceed 1000 characters')
];

/**
 * User password reset validation
 */
const validateUserPasswordReset = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('notify_user')
    .optional()
    .isBoolean()
    .withMessage('notify_user must be a boolean value')
];

/**
 * Wallet freeze/unfreeze validation
 */
const validateWalletFreeze = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('wallet_id')
    .isInt({ min: 1 })
    .withMessage('Valid wallet ID is required'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0.01'),
  
  body('action')
    .isIn(['freeze', 'unfreeze'])
    .withMessage('Action must be either "freeze" or "unfreeze"'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

/**
 * Trading pair creation validation
 */
const validateTradingPairCreate = [
  body('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Symbol must be between 3 and 20 characters')
    .matches(/^[A-Z0-9\/]+$/)
    .withMessage('Symbol can only contain uppercase letters, numbers, and forward slash'),
  
  body('base_currency')
    .notEmpty()
    .withMessage('Base currency is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Base currency must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Base currency can only contain uppercase letters and numbers'),
  
  body('quote_currency')
    .notEmpty()
    .withMessage('Quote currency is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Quote currency must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Quote currency can only contain uppercase letters and numbers'),
  
  body('min_trade_amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Minimum trade amount must be a positive number'),
  
  body('max_trade_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Maximum trade amount must be a positive number')
    .custom((value, { req }) => {
      if (parseFloat(value) <= parseFloat(req.body.min_trade_amount)) {
        throw new Error('Maximum trade amount must be greater than minimum trade amount');
      }
      return true;
    }),
  
  body('price_precision')
    .isInt({ min: 0, max: 8 })
    .withMessage('Price precision must be between 0 and 8'),
  
  body('amount_precision')
    .isInt({ min: 0, max: 8 })
    .withMessage('Amount precision must be between 0 and 8'),
  
  body('maker_fee')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Maker fee must be between 0 and 1 (0-100%)'),
  
  body('taker_fee')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Taker fee must be between 0 and 1 (0-100%)'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

/**
 * Trading pair update validation
 */
const validateTradingPairUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid trading pair ID is required'),
  
  body('symbol')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Symbol must be between 3 and 20 characters')
    .matches(/^[A-Z0-9\/]+$/)
    .withMessage('Symbol can only contain uppercase letters, numbers, and forward slash'),
  
  body('base_currency')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Base currency must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Base currency can only contain uppercase letters and numbers'),
  
  body('quote_currency')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Quote currency must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Quote currency can only contain uppercase letters and numbers'),
  
  body('min_trade_amount')
    .optional()
    .isFloat({ min: 0.00000001 })
    .withMessage('Minimum trade amount must be a positive number'),
  
  body('max_trade_amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Maximum trade amount must be a positive number'),
  
  body('price_precision')
    .optional()
    .isInt({ min: 0, max: 8 })
    .withMessage('Price precision must be between 0 and 8'),
  
  body('amount_precision')
    .optional()
    .isInt({ min: 0, max: 8 })
    .withMessage('Amount precision must be between 0 and 8'),
  
  body('maker_fee')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Maker fee must be between 0 and 1 (0-100%)'),
  
  body('taker_fee')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Taker fee must be between 0 and 1 (0-100%)'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

/**
 * Trading pair status toggle validation
 */
const validateTradingPairStatusToggle = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid trading pair ID is required'),
  
  body('is_active')
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

/**
 * Trading pair deletion validation
 */
const validateTradingPairDelete = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid trading pair ID is required'),
  
  body('confirm_deletion')
    .equals('true')
    .withMessage('Deletion confirmation is required')
];

/**
 * Pagination and search validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  
  query('sort_by')
    .optional()
    .isIn(['id', 'username', 'email', 'created_at', 'updated_at', 'symbol', 'base_currency', 'quote_currency'])
    .withMessage('Invalid sort field'),
  
  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC')
];

/**
 * ID parameter validation
 */
const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required')
];

/**
 * Date range validation
 */
const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.start_date && value) {
        const startDate = new Date(req.query.start_date);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

/**
 * Trading statistics period validation
 */
const validateTradingStatsPeriod = [
  query('period')
    .optional()
    .isIn(['1h', '24h', '7d', '30d'])
    .withMessage('Period must be one of: 1h, 24h, 7d, 30d')
];

module.exports = {
  validateAdminLogin,
  validateAdminProfileUpdate,
  validateAdminPasswordChange,
  validateUserUpdate,
  validateUserStatusUpdate,
  validateKYCStatusUpdate,
  validateUserPasswordReset,
  validateWalletFreeze,
  validateTradingPairCreate,
  validateTradingPairUpdate,
  validateTradingPairStatusToggle,
  validateTradingPairDelete,
  validatePagination,
  validateIdParam,
  validateDateRange,
  validateTradingStatsPeriod
};