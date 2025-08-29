const { Admin, User, Transaction, Market, Wallet, TradingPair, Trade } = require('../models');
const { 
  validateAdminCredentials, 
  generateAdminToken, 
  hashPassword 
} = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Admin login
 */
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Validate credentials
    const result = await validateAdminCredentials(email, password);
    
    if (!result.success) {
      logger.warn(`Failed admin login attempt for email: ${email}`, {
        ip: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

    // Generate JWT token
    const token = generateAdminToken(result.admin);

    logger.info(`Admin login successful: ${result.admin.username}`, {
      admin_id: result.admin.id,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: result.admin,
        token: token,
        expires_in: process.env.JWT_ADMIN_EXPIRES_IN || '8h'
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
};

/**
 * Get admin profile
 */
const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'last_login', 'created_at']
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    logger.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      code: 'GET_PROFILE_FAILED'
    });
  }
};

/**
 * Update admin profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { full_name, email } = req.body;
    const admin = await Admin.findByPk(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Check if email is already taken by another admin
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({
        where: {
          email: email,
          id: { [Op.ne]: admin.id }
        }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Update admin
    await admin.update({
      full_name: full_name || admin.full_name,
      email: email || admin.email
    });

    const updatedAdmin = await Admin.findByPk(admin.id, {
      attributes: ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'last_login', 'created_at']
    });

    logger.info(`Admin profile updated: ${admin.username}`, {
      admin_id: admin.id,
      changes: { full_name, email }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin
    });
  } catch (error) {
    logger.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_FAILED'
    });
  }
};

/**
 * Change admin password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { current_password, new_password } = req.body;
    const admin = await Admin.findByPk(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Verify current password
    const { comparePassword } = require('../middleware/adminAuth');
    const isValidPassword = await comparePassword(current_password, admin.password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(new_password);
    
    // Update password
    await admin.update({ password: hashedPassword });

    logger.info(`Admin password changed: ${admin.username}`, {
      admin_id: admin.id
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change admin password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_FAILED'
    });
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    console.log('🔍 Starting getDashboardStats...');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    console.log('📅 Date ranges calculated successfully');

    // Get user statistics
    console.log('👥 Getting user statistics...');
    const totalUsers = await User.count();
    console.log('✅ Total users:', totalUsers);
    const activeUsers = await User.count({ 
      where: { 
        status: 'active'
      } 
    });
    console.log('✅ Active users:', activeUsers);
    const newUsersToday = await User.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });
    console.log('✅ New users today:', newUsersToday);
    const newUsersThisMonth = await User.count({
      where: {
        created_at: { [Op.gte]: thisMonth }
      }
    });
    console.log('✅ New users this month:', newUsersThisMonth);

    // Get transaction statistics
    const totalTransactions = await Transaction.count();
    const transactionsToday = await Transaction.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });
    const transactionsThisMonth = await Transaction.count({
      where: {
        created_at: { [Op.gte]: thisMonth }
      }
    });

    // Get pending transactions
    const pendingTransactions = await Transaction.count({
      where: { status: 'PENDING' }
    });

    // Get volume statistics (sum of transaction amounts)
    const volumeToday = await Transaction.sum('amount', {
      where: {
        created_at: { [Op.gte]: today },
        status: 'COMPLETED'
      }
    }) || 0;

    const volumeThisMonth = await Transaction.sum('amount', {
      where: {
        created_at: { [Op.gte]: thisMonth },
        status: 'COMPLETED'
      }
    }) || 0;

    const totalVolume = await Transaction.sum('amount', {
      where: { status: 'COMPLETED' }
    }) || 0;

    // Get deposit statistics
    const pendingDeposits = await Transaction.count({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING'
      }
    });
    const depositsCompletedToday = await Transaction.count({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        created_at: { [Op.gte]: today }
      }
    });
    const depositAmountToday = await Transaction.sum('amount', {
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        created_at: { [Op.gte]: today }
      }
    }) || 0;

    // Get withdrawal statistics
    const pendingWithdrawals = await Transaction.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    });
    const withdrawalsCompletedToday = await Transaction.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        created_at: { [Op.gte]: today }
      }
    });
    const withdrawalAmountToday = await Transaction.sum('amount', {
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        created_at: { [Op.gte]: today }
      }
    }) || 0;

    // Get KYC statistics (using kyc_level field)
    const pendingKYC = await User.count({
      where: {
        kyc_level: 0 // Level 0 means pending/not verified
      }
    });
    const kycCompletedToday = await User.count({
      where: {
        kyc_level: { [Op.gt]: 0 }, // Level > 0 means verified
        updated_at: { [Op.gte]: today }
      }
    });

    // Get trading pairs count
    const totalTradingPairs = await Market.count();
    const activeTradingPairs = await Market.count({
      where: { is_active: true }
    });

    // Calculate growth percentages
    const usersGrowth = await calculateGrowthPercentage(
      User, 
      { created_at: { [Op.gte]: thisMonth } },
      { created_at: { [Op.gte]: lastMonth, [Op.lt]: thisMonth } }
    );

    const transactionsGrowth = await calculateGrowthPercentage(
      Transaction,
      { created_at: { [Op.gte]: today } },
      { created_at: { [Op.gte]: yesterday, [Op.lt]: today } }
    );

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new_today: newUsersToday,
        new_this_month: newUsersThisMonth,
        growth_percentage: usersGrowth
      },
      transactions: {
        total: totalTransactions,
        today: transactionsToday,
        this_month: transactionsThisMonth,
        pending: pendingTransactions,
        growth_percentage: transactionsGrowth
      },
      volume: {
        today: parseFloat(volumeToday.toFixed(2)),
        this_month: parseFloat(volumeThisMonth.toFixed(2)),
        total: parseFloat(totalVolume.toFixed(2))
      },
      deposits: {
        pending: pendingDeposits,
        completed_today: depositsCompletedToday,
        total_amount_today: parseFloat(depositAmountToday.toFixed(2))
      },
      withdrawals: {
        pending: pendingWithdrawals,
        completed_today: withdrawalsCompletedToday,
        total_amount_today: parseFloat(withdrawalAmountToday.toFixed(2))
      },
      kyc: {
        pending: pendingKYC,
        completed_today: kycCompletedToday
      },
      trading_pairs: {
        total: totalTradingPairs,
        active: activeTradingPairs
      },
      system: {
        status: 'online',
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        last_updated: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    console.error('❌ Error stack:', error.stack);
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard statistics',
      code: 'GET_STATS_FAILED'
    });
  }
};

/**
 * Get recent activities
 */
const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Get recent transactions
    const recentTransactions = await Transaction.findAll({
      limit: Math.min(limit, 50),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'transactionUser',
          attributes: ['id', 'username', 'email']
        }
      ],
      attributes: ['id', 'type', 'amount', 'status', 'created_at']
    });

    // Get recent user registrations
    const recentUsers = await User.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'username', 'email', 'created_at']
    });

    // Format activities
    const activities = [];

    // Add transaction activities
    recentTransactions.forEach(tx => {
      activities.push({
        id: `tx_${tx.id}`,
        type: 'transaction',
        message: `${tx.type} transaction of ${tx.amount} by ${tx.transactionUser?.username || 'Unknown'}`,
        status: tx.status,
        timestamp: tx.created_at,
        user: tx.transactionUser?.username || 'Unknown',
        details: {
          transaction_id: tx.id,
          amount: tx.amount,
          type: tx.type
        }
      });
    });

    // Add user registration activities
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_registration',
        message: `New user registered: ${user.username}`,
        status: 'completed',
        timestamp: user.created_at,
        user: user.username,
        details: {
          user_id: user.id,
          email: user.email
        }
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: activities.slice(0, limit),
      pagination: {
        limit,
        offset,
        total: activities.length
      }
    });
  } catch (error) {
    console.error('❌ Get recent activities error:', error);
    console.error('❌ Error stack:', error.stack);
    logger.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent activities',
      code: 'GET_ACTIVITIES_FAILED'
    });
  }
};

/**
 * Helper function to calculate growth percentage
 */
const calculateGrowthPercentage = async (model, currentPeriod, previousPeriod) => {
  try {
    const current = await model.count({ where: currentPeriod });
    const previous = await model.count({ where: previousPeriod });
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  } catch (error) {
    logger.error('Calculate growth percentage error:', error);
    return 0;
  }
};

/**
 * Logout admin (invalidate token - for future token blacklist implementation)
 */
const logout = async (req, res) => {
  try {
    // In a production environment, you might want to implement token blacklisting
    // For now, we'll just log the logout event
    logger.info(`Admin logout: ${req.admin.username}`, {
      admin_id: req.admin.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
};

/**
 * Verify admin token
 */
const verify = async (req, res) => {
  try {
    // If we reach here, the token is valid (verified by middleware)
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'email', 'name', 'role', 'status', 'last_login', 'created_at']
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        admin: admin
      }
    });
  } catch (error) {
    logger.error('Admin token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED'
    });
  }
};

/**
 * Get market data for dashboard
 */
const getMarketData = async (req, res) => {
  try {
    // Get top trading pairs with 24h statistics
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const marketData = await Market.findAll({
      where: { is_active: true },
      limit: 10,
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'symbol',
        'base_currency_id',
        'quote_currency_id',
        'last_price'
      ]
    });

    // Format market data
    const formattedData = marketData.map(pair => {
      const pairData = pair.toJSON();
      const currentPrice = parseFloat(pairData.last_price || 0);
      
      return {
        symbol: pairData.symbol,
        price: currentPrice.toFixed(8),
        change24h: '0.00%', // Mock data - would need historical price data
        volume24h: '0.00', // Mock data - would need transaction aggregation
        high24h: currentPrice.toFixed(8), // Mock data
        low24h: currentPrice.toFixed(8) // Mock data
      };
    });

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('❌ Get market data error:', error);
    console.error('❌ Error stack:', error.stack);
    logger.error('Get market data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market data',
      code: 'GET_MARKET_DATA_FAILED'
    });
  }
};

/**
 * Get recent transactions for dashboard
 */
const getRecentTransactions = async (req, res) => {
  try {
    console.log('🔍 Getting recent transactions...');
    const limit = parseInt(req.query.limit) || 10;
    console.log('📊 Limit:', limit);
    
    console.log('🔍 Executing Transaction.findAll query...');
    const recentTransactions = await Transaction.findAll({
      limit,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'transactionUser',
          attributes: ['id', 'username', 'email']
        }
      ],
      attributes: ['id', 'type', 'amount', 'currency', 'status', 'created_at']
    });

    // Format transaction data
    const formattedTransactions = recentTransactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      user: tx.transactionUser?.username || 'Unknown',
      amount: parseFloat(tx.amount).toFixed(8),
      currency: tx.currency || 'N/A',
      status: tx.status,
      timestamp: tx.created_at
    }));

    res.json({
      success: true,
      data: formattedTransactions
    });
  } catch (error) {
    console.error('❌ Get recent transactions error:', error);
    console.error('❌ Error stack:', error.stack);
    logger.error('Get recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent transactions',
      code: 'GET_RECENT_TRANSACTIONS_FAILED'
    });
  }
};

/**
 * Get deposits with pagination and filters
 */
const getDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { type: 'DEPOSIT' };
    if (status) whereClause.status = status.toUpperCase();
    if (user_id) whereClause.user_id = user_id;
    
    const deposits = await Transaction.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'transactionUser',
        attributes: ['id', 'username', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: {
        deposits: deposits.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(deposits.count / limit),
          total_items: deposits.count,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get deposits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deposits',
      code: 'GET_DEPOSITS_FAILED'
    });
  }
};

/**
 * Get deposit by ID
 */
const getDepositById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deposit = await Transaction.findOne({
      where: { id, type: 'DEPOSIT' },
      include: [{
        model: User,
        as: 'transactionUser',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found',
        code: 'DEPOSIT_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: deposit
    });
  } catch (error) {
    logger.error('Get deposit by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deposit',
      code: 'GET_DEPOSIT_FAILED'
    });
  }
};

/**
 * Update deposit status
 */
const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const deposit = await Transaction.findOne({
      where: { id, type: 'DEPOSIT' }
    });
    
    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found',
        code: 'DEPOSIT_NOT_FOUND'
      });
    }
    
    await deposit.update({
      status: status.toUpperCase(),
      notes,
      updated_at: new Date()
    });
    
    res.json({
      success: true,
      message: 'Deposit status updated successfully',
      data: deposit
    });
  } catch (error) {
    logger.error('Update deposit status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deposit status',
      code: 'UPDATE_DEPOSIT_STATUS_FAILED'
    });
  }
};

/**
 * Get withdrawals with pagination and filters
 */
const getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { type: 'WITHDRAWAL' };
    if (status) whereClause.status = status.toUpperCase();
    if (user_id) whereClause.user_id = user_id;
    
    const withdrawals = await Transaction.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'transactionUser',
        attributes: ['id', 'username', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: {
        withdrawals: withdrawals.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(withdrawals.count / limit),
          total_items: withdrawals.count,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawals',
      code: 'GET_WITHDRAWALS_FAILED'
    });
  }
};

/**
 * Get withdrawal by ID
 */
const getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await Transaction.findOne({
      where: { id, type: 'WITHDRAWAL' },
      include: [{
        model: User,
        as: 'transactionUser',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found',
        code: 'WITHDRAWAL_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: withdrawal
    });
  } catch (error) {
    logger.error('Get withdrawal by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawal',
      code: 'GET_WITHDRAWAL_FAILED'
    });
  }
};

/**
 * Update withdrawal status
 */
const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const withdrawal = await Transaction.findOne({
      where: { id, type: 'WITHDRAWAL' }
    });
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found',
        code: 'WITHDRAWAL_NOT_FOUND'
      });
    }
    
    await withdrawal.update({
      status: status.toUpperCase(),
      notes,
      updated_at: new Date()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal status updated successfully',
      data: withdrawal
    });
  } catch (error) {
    logger.error('Update withdrawal status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update withdrawal status',
      code: 'UPDATE_WITHDRAWAL_STATUS_FAILED'
    });
  }
};

/**
 * Get system settings
 */
const getSettings = async (req, res) => {
  try {
    // Mock settings data - replace with actual settings model
    const settings = {
      trading: {
        enabled: true,
        maintenance_mode: false,
        min_trade_amount: 0.001,
        max_trade_amount: 1000000,
        trading_fee: 0.001
      },
      deposits: {
        enabled: true,
        min_deposit: 10,
        max_deposit: 100000,
        auto_approval: false
      },
      withdrawals: {
        enabled: true,
        min_withdrawal: 10,
        max_withdrawal: 50000,
        daily_limit: 100000,
        auto_approval: false,
        approval_threshold: 1000
      },
      kyc: {
        required: true,
        levels: {
          level_1: { daily_limit: 1000, monthly_limit: 10000 },
          level_2: { daily_limit: 10000, monthly_limit: 100000 },
          level_3: { daily_limit: 100000, monthly_limit: 1000000 }
        }
      },
      security: {
        two_factor_required: true,
        session_timeout: 3600,
        max_login_attempts: 5,
        lockout_duration: 1800
      }
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
      code: 'GET_SETTINGS_FAILED'
    });
  }
};

/**
 * Update system settings
 */
const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    // Mock update - replace with actual settings update logic
    logger.info('Settings updated by admin:', {
      admin_id: req.admin.id,
      settings: settings
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      code: 'UPDATE_SETTINGS_FAILED'
    });
  }
};

/**
 * Get dashboard overview data
 */
const getDashboard = async (req, res) => {
  try {
    // Combine dashboard stats with additional overview data
    const stats = await getDashboardStats(req, { json: () => {} });
    
    const dashboardData = {
      stats: stats,
      recent_activities: await getRecentActivities(req, { json: () => {} }),
      recent_transactions: await getRecentTransactions(req, { json: () => {} }),
      market_data: await getMarketData(req, { json: () => {} })
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      code: 'GET_DASHBOARD_FAILED'
    });
  }
};

module.exports = {
  login,
  logout,
  verify,
  getProfile,
  updateProfile,
  changePassword,
  getDashboardStats,
  getRecentActivities,
  getMarketData,
  getRecentTransactions,
  getDeposits,
  getDepositById,
  updateDepositStatus,
  getWithdrawals,
  getWithdrawalById,
  updateWithdrawalStatus,
  getSettings,
  updateSettings,
  getDashboard
};