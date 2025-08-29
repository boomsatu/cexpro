const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Import controllers
const adminController = require('../controllers/adminController');
const adminUserController = require('../controllers/adminUserController');
const adminTradingController = require('../controllers/adminTradingController');
const adminCryptocurrencyController = require('../controllers/adminCryptocurrencyController');

// Import middleware
const { verifyAdminToken, requireAdminRole, logAdminActivity } = require('../middleware/adminAuth');

// Import validators
const {
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
} = require('../validators/adminValidators');

// Rate limiting for admin endpoints - DISABLED FOR DEVELOPMENT
// const adminRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too many requests from this IP, please try again later.',
//     code: 'RATE_LIMIT_EXCEEDED'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// Stricter rate limiting for login endpoint - DISABLED FOR DEVELOPMENT
// const loginRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 login attempts per windowMs
//   message: {
//     success: false,
//     error: 'Too many login attempts, please try again later.',
//     code: 'LOGIN_RATE_LIMIT_EXCLUDED'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// Apply rate limiting to all admin routes - DISABLED FOR DEVELOPMENT
// router.use(adminRateLimit);

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/auth/login', validateAdminLogin, adminController.login);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin)
 */
router.post('/auth/logout', verifyAdminToken, logAdminActivity, adminController.logout);

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private (Admin)
 */
router.get('/auth/verify', verifyAdminToken, adminController.verify);

// ============================================================================
// ADMIN PROFILE ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/profile
 * @desc    Get admin profile
 * @access  Private (Admin)
 */
router.get('/profile', verifyAdminToken, adminController.getProfile);

/**
 * @route   PUT /api/admin/profile
 * @desc    Update admin profile
 * @access  Private (Admin)
 */
router.put('/profile', verifyAdminToken, validateAdminProfileUpdate, logAdminActivity, adminController.updateProfile);

/**
 * @route   PUT /api/admin/profile/password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
router.put('/profile/password', verifyAdminToken, validateAdminPasswordChange, logAdminActivity, adminController.changePassword);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard/stats', verifyAdminToken, adminController.getDashboardStats);

/**
 * @route   GET /api/admin/dashboard/activities
 * @desc    Get recent activities
 * @access  Private (Admin)
 */
router.get('/dashboard/activities', verifyAdminToken, validatePagination, adminController.getRecentActivities);

/**
 * @route   GET /api/admin/dashboard/market
 * @desc    Get market data for dashboard
 * @access  Private (Admin)
 */
router.get('/dashboard/market', verifyAdminToken, adminController.getMarketData);

/**
 * @route   GET /api/admin/dashboard/transactions
 * @desc    Get recent transactions for dashboard
 * @access  Private (Admin)
 */
router.get('/dashboard/transactions', verifyAdminToken, adminController.getRecentTransactions);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin)
 */
router.get('/users', verifyAdminToken, validatePagination, adminUserController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details by ID
 * @access  Private (Admin)
 */
router.get('/users/:id', verifyAdminToken, validateIdParam, adminUserController.getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user data
 * @access  Private (Admin)
 */
router.put('/users/:id', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), validateUserUpdate, logAdminActivity, adminUserController.updateUser);

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private (Super Admin)
 */
router.put('/users/:id/status', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), validateUserStatusUpdate, logAdminActivity, adminUserController.updateUserStatus);

/**
 * @route   PUT /api/admin/users/:id/kyc
 * @desc    Update user KYC status
 * @access  Private (Admin)
 */
router.put('/users/:id/kyc', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), validateKYCStatusUpdate, logAdminActivity, adminUserController.updateKYCStatus);

/**
 * @route   PUT /api/admin/users/:id/password
 * @desc    Reset user password
 * @access  Private (Super Admin)
 */
router.put('/users/:id/password', verifyAdminToken, requireAdminRole(['super_admin']), validateUserPasswordReset, logAdminActivity, adminUserController.resetUserPassword);

/**
 * @route   GET /api/admin/users/:id/transactions
 * @desc    Get user transaction history
 * @access  Private (Admin)
 */
router.get('/users/:id/transactions', verifyAdminToken, validateIdParam, validatePagination, validateDateRange, adminUserController.getUserTransactions);

/**
 * @route   PUT /api/admin/users/:id/wallet/freeze
 * @desc    Freeze/Unfreeze user wallet balance
 * @access  Private (Super Admin)
 */
router.put('/users/:id/wallet/freeze', verifyAdminToken, requireAdminRole(['super_admin']), validateWalletFreeze, logAdminActivity, adminUserController.updateWalletFreeze);

// ============================================================================
// DEPOSITS AND WITHDRAWALS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/deposits
 * @desc    Get all deposits with pagination and filters
 * @access  Private (Admin)
 */
router.get('/deposits', verifyAdminToken, validatePagination, adminController.getDeposits);

/**
 * @route   GET /api/admin/deposits/:id
 * @desc    Get deposit details by ID
 * @access  Private (Admin)
 */
router.get('/deposits/:id', verifyAdminToken, validateIdParam, adminController.getDepositById);

/**
 * @route   PUT /api/admin/deposits/:id/status
 * @desc    Update deposit status (approve/reject)
 * @access  Private (Admin)
 */
router.put('/deposits/:id/status', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), logAdminActivity, adminController.updateDepositStatus);

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawals with pagination and filters
 * @access  Private (Admin)
 */
router.get('/withdrawals', verifyAdminToken, validatePagination, adminController.getWithdrawals);

/**
 * @route   GET /api/admin/withdrawals/:id
 * @desc    Get withdrawal details by ID
 * @access  Private (Admin)
 */
router.get('/withdrawals/:id', verifyAdminToken, validateIdParam, adminController.getWithdrawalById);

/**
 * @route   PUT /api/admin/withdrawals/:id/status
 * @desc    Update withdrawal status (approve/reject)
 * @access  Private (Admin)
 */
router.put('/withdrawals/:id/status', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), logAdminActivity, adminController.updateWithdrawalStatus);

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/settings
 * @desc    Get system settings
 * @access  Private (Admin)
 */
router.get('/settings', verifyAdminToken, adminController.getSettings);

/**
 * @route   PUT /api/admin/settings
 * @desc    Update system settings
 * @access  Private (Super Admin)
 */
router.put('/settings', verifyAdminToken, requireAdminRole(['super_admin']), logAdminActivity, adminController.updateSettings);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard overview data
 * @access  Private (Admin)
 */
router.get('/dashboard', verifyAdminToken, adminController.getDashboard);

// ============================================================================
// TRADING MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/trading-pairs
 * @desc    Get all trading pairs (alternative endpoint)
 * @access  Private (Admin)
 */
router.get('/trading-pairs', verifyAdminToken, validatePagination, adminTradingController.getTradingPairs);

/**
 * @route   GET /api/admin/trading/pairs
 * @desc    Get all trading pairs
 * @access  Private (Admin)
 */
router.get('/trading/pairs', verifyAdminToken, validatePagination, adminTradingController.getTradingPairs);

/**
 * @route   GET /api/admin/trading/pairs/:id
 * @desc    Get trading pair details by ID
 * @access  Private (Admin)
 */
router.get('/trading/pairs/:id', verifyAdminToken, validateIdParam, adminTradingController.getTradingPairById);

/**
 * @route   POST /api/admin/trading/pairs
 * @desc    Create new trading pair
 * @access  Private (Super Admin)
 */
router.post('/trading/pairs', verifyAdminToken, requireAdminRole(['super_admin']), validateTradingPairCreate, logAdminActivity, adminTradingController.createTradingPair);

/**
 * @route   PUT /api/admin/trading/pairs/:id
 * @desc    Update trading pair
 * @access  Private (Super Admin)
 */
router.put('/trading/pairs/:id', verifyAdminToken, requireAdminRole(['super_admin']), validateTradingPairUpdate, logAdminActivity, adminTradingController.updateTradingPair);

/**
 * @route   PUT /api/admin/trading/pairs/:id/status
 * @desc    Toggle trading pair status
 * @access  Private (Admin)
 */
router.put('/trading/pairs/:id/status', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), validateTradingPairStatusToggle, logAdminActivity, adminTradingController.toggleTradingPairStatus);

/**
 * @route   DELETE /api/admin/trading/pairs/:id
 * @desc    Delete trading pair
 * @access  Private (Super Admin)
 */
router.delete('/trading/pairs/:id', verifyAdminToken, requireAdminRole(['super_admin']), validateTradingPairDelete, logAdminActivity, adminTradingController.deleteTradingPair);

/**
 * @route   GET /api/admin/trading/trades
 * @desc    Get all trades with pagination and filters
 * @access  Private (Admin)
 */
router.get('/trading/trades', verifyAdminToken, validatePagination, validateDateRange, adminTradingController.getTrades);

/**
 * @route   GET /api/admin/trading/stats
 * @desc    Get trading statistics overview
 * @access  Private (Admin)
 */
router.get('/trading/stats', verifyAdminToken, validateTradingStatsPeriod, adminTradingController.getTradingStats);

// ============================================================================
// CRYPTOCURRENCY MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/cryptocurrencies
 * @desc    Get all cryptocurrencies
 * @access  Private (Admin)
 */
router.get('/cryptocurrencies', verifyAdminToken, validatePagination, adminCryptocurrencyController.getCryptocurrencies);

/**
 * @route   GET /api/admin/cryptocurrencies/:id
 * @desc    Get cryptocurrency details by ID
 * @access  Private (Admin)
 */
router.get('/cryptocurrencies/:id', verifyAdminToken, validateIdParam, adminCryptocurrencyController.getCryptocurrencyById);

/**
 * @route   POST /api/admin/cryptocurrencies
 * @desc    Create new cryptocurrency
 * @access  Private (Super Admin)
 */
router.post('/cryptocurrencies', verifyAdminToken, requireAdminRole(['super_admin']), logAdminActivity, adminCryptocurrencyController.createCryptocurrency);

/**
 * @route   PUT /api/admin/cryptocurrencies/:id
 * @desc    Update cryptocurrency
 * @access  Private (Super Admin)
 */
router.put('/cryptocurrencies/:id', verifyAdminToken, requireAdminRole(['super_admin']), validateIdParam, logAdminActivity, adminCryptocurrencyController.updateCryptocurrency);

/**
 * @route   PUT /api/admin/cryptocurrencies/:id/status
 * @desc    Toggle cryptocurrency status
 * @access  Private (Admin)
 */
router.put('/cryptocurrencies/:id/status', verifyAdminToken, requireAdminRole(['super_admin', 'admin']), validateIdParam, logAdminActivity, adminCryptocurrencyController.toggleCryptocurrencyStatus);

/**
 * @route   DELETE /api/admin/cryptocurrencies/:id
 * @desc    Delete cryptocurrency
 * @access  Private (Super Admin)
 */
router.delete('/cryptocurrencies/:id', verifyAdminToken, requireAdminRole(['super_admin']), validateIdParam, logAdminActivity, adminCryptocurrencyController.deleteCryptocurrency);

// ============================================================================
// SYSTEM HEALTH AND MONITORING ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/system/health', verifyAdminToken, (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      database: 'connected', // This should be checked against actual DB connection
      services: {
        api: 'online',
        websocket: 'online',
        redis: 'online' // This should be checked against actual Redis connection
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      code: 'HEALTH_CHECK_FAILED'
    });
  }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// Handle 404 for admin routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl
  });
});

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details
    });
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Handle database errors
  if (error.name === 'SequelizeError') {
    return res.status(500).json({
      success: false,
      error: 'Database error',
      code: 'DATABASE_ERROR'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router;