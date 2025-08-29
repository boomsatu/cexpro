const express = require('express');
const { body, param, query } = require('express-validator');
const tradingController = require('../controllers/tradingController');
const { requireAuth, optionalAuth, requireKYCLevel } = require('../middleware/auth');
const { 
  tradingRateLimit, 
  orderRateLimit, 
  marketDataRateLimit,
  createRateLimiter 
} = require('../middleware/rateLimit');
const router = express.Router();

// Validation rules
const orderValidation = [
  body('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .isString()
    .withMessage('Symbol must be a string')
    .isLength({ min: 3, max: 20 })
    .withMessage('Symbol must be between 3 and 20 characters'),
    
  body('side')
    .notEmpty()
    .withMessage('Side is required')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be buy or sell'),
    
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['market', 'limit', 'stop', 'stop_limit'])
    .withMessage('Type must be market, limit, stop, or stop_limit'),
    
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be a positive number'),
    
  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Price must be a positive number'),
    
  body('stopPrice')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Stop price must be a positive number'),
    
  body('timeInForce')
    .optional()
    .isIn(['GTC', 'IOC', 'FOK'])
    .withMessage('Time in force must be GTC, IOC, or FOK'),
    
  body('clientOrderId')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('Client order ID must be a string with max 64 characters')
];

const symbolValidation = [
  param('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .isString()
    .withMessage('Symbol must be a string')
    .isLength({ min: 3, max: 20 })
    .withMessage('Symbol must be between 3 and 20 characters')
];

const orderIdValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string')
];

const walletIdValidation = [
  param('walletId')
    .notEmpty()
    .withMessage('Wallet ID is required')
    .isInt({ gt: 0 })
    .withMessage('Wallet ID must be a positive integer')
];

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
    
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const timeRangeValidation = [
  query('startTime')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Start time must be a positive timestamp'),
    
  query('endTime')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('End time must be a positive timestamp')
];

// Order Management Routes

/**
 * @route   POST /api/trading/orders
 * @desc    Place a new order
 * @access  Private
 */
router.post('/orders',
  requireAuth,
  requireKYCLevel(1), // Minimal KYC level 1 untuk trading
  orderRateLimit,
  orderValidation,
  tradingController.placeOrder
);

/**
 * @route   DELETE /api/trading/orders/:orderId
 * @desc    Cancel an order
 * @access  Private
 */
router.delete('/orders/:orderId',
  requireAuth,
  orderRateLimit,
  orderIdValidation,
  tradingController.cancelOrder
);

/**
 * @route   DELETE /api/trading/orders
 * @desc    Cancel all orders
 * @access  Private
 */
router.delete('/orders',
  requireAuth,
  createRateLimiter({ windowMs: 60000, max: 10 }),
  tradingController.cancelAllOrders
);

/**
 * @route   GET /api/trading/orders
 * @desc    Get user orders
 * @access  Private
 */
router.get('/orders',
  requireAuth,
  tradingRateLimit,
  paginationValidation,
  timeRangeValidation,
  tradingController.getUserOrders
);

/**
 * @route   GET /api/trading/orders/:orderId
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/orders/:orderId',
  requireAuth,
  tradingRateLimit,
  orderIdValidation,
  tradingController.getOrderById
);

// Trade History Routes

/**
 * @route   GET /api/trading/trades
 * @desc    Get user trades
 * @access  Private
 */
router.get('/trades',
  requireAuth,
  tradingRateLimit,
  paginationValidation,
  timeRangeValidation,
  tradingController.getUserTrades
);

// Market Data Routes (Public)

/**
 * @route   GET /api/trading/orderbook/:symbol
 * @desc    Get order book for a symbol
 * @access  Public
 */
router.get('/orderbook/:symbol',
  optionalAuth,
  marketDataRateLimit,
  symbolValidation,
  [
    query('depth')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Depth must be between 1 and 100')
  ],
  tradingController.getOrderBook
);

/**
 * @route   GET /api/trading/ticker/:symbol?
 * @desc    Get ticker for a symbol or all symbols
 * @access  Public
 */
router.get('/ticker/:symbol?',
  optionalAuth,
  marketDataRateLimit,
  [
    param('symbol')
      .optional()
      .isString()
      .isLength({ min: 3, max: 20 })
      .withMessage('Symbol must be between 3 and 20 characters')
  ],
  tradingController.getTicker
);

/**
 * @route   GET /api/trading/candlesticks/:symbol
 * @desc    Get candlestick data for a symbol
 * @access  Public
 */
router.get('/candlesticks/:symbol',
  optionalAuth,
  marketDataRateLimit,
  symbolValidation,
  [
    query('interval')
      .notEmpty()
      .withMessage('Interval is required')
      .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
      .withMessage('Invalid interval'),
      
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ],
  timeRangeValidation,
  tradingController.getCandlesticks
);

/**
 * @route   GET /api/trading/trades/:symbol
 * @desc    Get recent trades for a symbol
 * @access  Public
 */
router.get('/trades/:symbol',
  optionalAuth,
  marketDataRateLimit,
  symbolValidation,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ],
  tradingController.getRecentTrades
);

/**
 * @route   GET /api/trading/stats
 * @desc    Get market statistics
 * @access  Public
 */
router.get('/stats',
  optionalAuth,
  marketDataRateLimit,
  tradingController.getMarketStats
);

// Balance and Wallet Routes

/**
 * @route   GET /api/trading/balances
 * @desc    Get user balances
 * @access  Private
 */
router.get('/balances',
  requireAuth,
  tradingRateLimit,
  [
    query('currency')
      .optional()
      .isString()
      .isLength({ min: 2, max: 10 })
      .withMessage('Currency must be between 2 and 10 characters')
  ],
  tradingController.getUserBalances
);

/**
 * @route   GET /api/trading/wallets
 * @desc    Get user wallets
 * @access  Private
 */
router.get('/wallets',
  requireAuth,
  tradingRateLimit,
  [
    query('currency')
      .optional()
      .isString()
      .isLength({ min: 2, max: 10 })
      .withMessage('Currency must be between 2 and 10 characters'),
      
    query('walletType')
      .optional()
      .isIn(['hot', 'warm', 'cold'])
      .withMessage('Wallet type must be hot, warm, or cold')
  ],
  tradingController.getUserWallets
);

/**
 * @route   POST /api/trading/wallets
 * @desc    Create a new wallet
 * @access  Private
 */
router.post('/wallets',
  requireAuth,
  requireKYCLevel(2), // KYC level 2 untuk membuat wallet
  createRateLimiter({ windowMs: 60000, max: 10 }),
  [
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isString()
      .isLength({ min: 2, max: 10 })
      .withMessage('Currency must be between 2 and 10 characters'),
      
    body('walletType')
      .optional()
      .isIn(['hot', 'warm', 'cold'])
      .withMessage('Wallet type must be hot, warm, or cold')
  ],
  tradingController.createWallet
);

/**
 * @route   POST /api/trading/wallets/:walletId/address
 * @desc    Generate new address for wallet
 * @access  Private
 */
router.post('/wallets/:walletId/address',
  requireAuth,
  createRateLimiter({ windowMs: 60000, max: 20 }),
  walletIdValidation,
  tradingController.generateNewAddress
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Trading route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

module.exports = router;