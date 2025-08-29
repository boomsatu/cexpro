const { User, Wallet, Transaction, KYC } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { hashPassword } = require('../middleware/adminAuth');

/**
 * Get all users with pagination and filters
 */
const getUsers = async (req, res) => {
  try {
    console.log('🔍 Starting getUsers request...');
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      kyc_status = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Status filter (matches User.status enum)
    if (status) {
      whereClause.status = status;
    }

    // Build includes if KYC filter requested
    const includeOptions = [];

    if (kyc_status) {
      includeOptions.push({
        model: KYC,
        as: 'kycDocuments',
        where: { status: kyc_status },
        required: true,
        attributes: ['id', 'status', 'document_type', 'submitted_at', 'verified_at']
      });
    }

    console.log('🔍 About to execute User.findAndCountAll...');
    console.log('📊 Include options:', JSON.stringify(includeOptions, null, 2));

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      attributes: {
        exclude: ['password', 'twoFactorSecret']
      }
    });

    console.log('✅ User.findAndCountAll completed successfully');

    // Calculate additional statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toJSON();

        // Get transaction count and volume
        const transactionStats = await Transaction.findAll({
          where: { user_id: user.id },
          attributes: [
            [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'total_transactions'],
            [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total_volume']
          ],
          raw: true
        });

        userObj.stats = {
          total_transactions: parseInt(transactionStats[0]?.total_transactions) || 0,
          total_volume: parseFloat(transactionStats[0]?.total_volume) || 0
        };

        return userObj;
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in getUsers:', error.message);
    console.error('📋 Full error:', error);
    logger.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      code: 'GET_USERS_FAILED'
    });
  }
};

/**
 * Get user details by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        {
          model: Wallet,
          as: 'wallets',
          attributes: ['id', 'currency', 'balance', 'pending_balance', 'status', 'created_at']
        },
        {
          model: KYC,
          as: 'kycDocuments',
          attributes: ['id', 'status', 'level', 'document_type', 'submitted_at', 'verified_at', 'rejection_reason']
        },
        {
          model: Transaction,
          as: 'transactions',
          limit: 10,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'type', 'amount', 'status', 'created_at']
        }
      ],
      attributes: {
        exclude: ['password', 'twoFactorSecret']
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get additional statistics
    const stats = await Transaction.findAll({
      where: { user_id: id },
      attributes: [
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'total_transactions'],
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total_volume'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.literal("CASE WHEN status = 'COMPLETED' THEN 1 END")), 'completed_transactions'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.literal("CASE WHEN status = 'PENDING' THEN 1 END")), 'pending_transactions']
      ],
      raw: true
    });

    const userObj = user.toJSON();
    userObj.stats = {
      total_transactions: parseInt(stats[0]?.total_transactions) || 0,
      total_volume: parseFloat(stats[0]?.total_volume) || 0,
      completed_transactions: parseInt(stats[0]?.completed_transactions) || 0,
      pending_transactions: parseInt(stats[0]?.pending_transactions) || 0
    };

    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details',
      code: 'GET_USER_FAILED'
    });
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { is_active, reason } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const oldStatus = user.is_active;
    await user.update({ is_active });

    // Log the action
    logger.info(`User status updated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      user_id: id,
      old_status: oldStatus,
      new_status: is_active,
      reason: reason || 'No reason provided'
    });

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        user_id: id,
        is_active,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      code: 'UPDATE_USER_STATUS_FAILED'
    });
  }
};

/**
 * Update user data
 */
const updateUser = async (req, res) => {
  console.log('updateUser function called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request params:', JSON.stringify(req.params, null, 2));
  try {
    const errors = validationResult(req);
    console.log('Validation result:', errors.isEmpty() ? 'No errors' : 'Has errors');
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Map frontend fields to backend fields
    if (updateData.kycStatus) {
      // Convert kycStatus to kycLevel if kycLevel is not explicitly provided
      if (updateData.kycLevel === undefined) {
        const kycStatusToLevel = {
          'pending': 0,
          'approved': 1,
          'rejected': 0
        };
        updateData.kycLevel = kycStatusToLevel[updateData.kycStatus] || 0;
      }
      delete updateData.kycStatus; // Remove the frontend field
    }
    
    // Validate kycLevel if provided
    if (updateData.kycLevel !== undefined) {
      const kycLevel = parseInt(updateData.kycLevel);
      if (isNaN(kycLevel) || kycLevel < 0 || kycLevel > 3) {
        return res.status(400).json({
          success: false,
          error: 'Invalid KYC level. Must be between 0 and 3',
          code: 'INVALID_KYC_LEVEL'
        });
      }
      updateData.kycLevel = kycLevel;
    }

    // Remove any undefined or null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Check if user exists
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Compare with existing data and only keep changed fields
    const changedFields = {};
    Object.keys(updateData).forEach(key => {
      if (user[key] !== updateData[key]) {
        changedFields[key] = updateData[key];
      }
    });

    // If no fields have changed, return success without updating
    if (Object.keys(changedFields).length === 0) {
      console.log('No fields changed, skipping database update');
      return res.json({
        success: true,
        message: 'No changes detected',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          status: user.status,
          updated_at: user.updated_at
        }
      });
    }

    console.log('Fields to be updated:', Object.keys(changedFields));
    console.log('Changed data:', JSON.stringify(changedFields, null, 2));

    // Use changedFields instead of updateData for the rest of the function
    const finalUpdateData = changedFields;

    // Check for email uniqueness if email is being updated
    if (finalUpdateData.email && finalUpdateData.email !== user.email) {
      console.log(`Checking email uniqueness for: ${finalUpdateData.email}`);
      const existingUser = await User.findOne({
        where: {
          email: finalUpdateData.email,
          id: { [Op.ne]: id }
        }
      });

      if (existingUser) {
        console.log(`Email ${finalUpdateData.email} already exists for user ID: ${existingUser.id}`);
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
      console.log('Email uniqueness check passed');
    }

    // Check for username uniqueness if username is being updated
    if (finalUpdateData.username && finalUpdateData.username !== user.username) {
      const existingUser = await User.findOne({
        where: {
          username: finalUpdateData.username,
          id: { [Op.ne]: id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists',
          code: 'USERNAME_EXISTS'
        });
      }
    }

    // Update user with only changed fields
    const [updatedRowsCount] = await User.update(finalUpdateData, {
      where: { id }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or no changes made',
        code: 'UPDATE_FAILED'
      });
    }

    // Get updated user data
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });

    // Log the action
    logger.info(`User updated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      user_id: id,
      updated_fields: Object.keys(finalUpdateData),
      updated_data: finalUpdateData
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'UPDATE_USER_FAILED'
    });
  }
};

/**
 * Update user KYC status
 */
const updateKYCStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, level, rejection_reason } = req.body;

    const user = await User.findByPk(id, {
      include: [{ model: KYC }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.KYC) {
      return res.status(404).json({
        success: false,
        error: 'KYC record not found for this user',
        code: 'KYC_NOT_FOUND'
      });
    }

    const updateData = { status };
    
    if (level) updateData.level = level;
    if (status === 'verified') {
      updateData.verified_at = new Date();
      updateData.rejection_reason = null;
    } else if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
      updateData.verified_at = null;
    }

    await user.KYC.update(updateData);

    // Log the action
    logger.info(`KYC status updated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      user_id: id,
      kyc_id: user.KYC.id,
      old_status: user.KYC.status,
      new_status: status,
      level,
      rejection_reason
    });

    res.json({
      success: true,
      message: 'KYC status updated successfully',
      data: {
        user_id: id,
        kyc_status: status,
        level,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Update KYC status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update KYC status',
      code: 'UPDATE_KYC_STATUS_FAILED'
    });
  }
};

/**
 * Reset user password
 */
const resetUserPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { new_password, notify_user = true } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(new_password);
    await user.update({ password: hashedPassword });

    // Log the action
    logger.info(`User password reset by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      user_id: id,
      user_email: user.email,
      notify_user
    });

    // TODO: Send email notification to user if notify_user is true
    // This would require implementing email service

    res.json({
      success: true,
      message: 'User password reset successfully',
      data: {
        user_id: id,
        reset_at: new Date().toISOString(),
        notification_sent: notify_user
      }
    });
  } catch (error) {
    logger.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user password',
      code: 'RESET_PASSWORD_FAILED'
    });
  }
};

/**
 * Get user transaction history
 */
const getUserTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = { user_id: id };

    // Type filter
    if (type) {
      whereClause.type = type;
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Date range filter
    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) {
        whereClause.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.created_at[Op.lte] = new Date(end_date);
      }
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'type', 'amount', 'fee', 'status', 'description', 'created_at', 'updated_at']
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user transactions',
      code: 'GET_USER_TRANSACTIONS_FAILED'
    });
  }
};

/**
 * Freeze/Unfreeze user wallet balance
 */
const updateWalletFreeze = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { wallet_id, amount, action, reason } = req.body; // action: 'freeze' or 'unfreeze'

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const wallet = await Wallet.findOne({
      where: { id: wallet_id, user_id: id }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    const freezeAmount = parseFloat(amount);
    
    if (action === 'freeze') {
      if (wallet.balance < freezeAmount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance to freeze',
          code: 'INSUFFICIENT_BALANCE'
        });
      }
      
      await wallet.update({
        balance: wallet.balance - freezeAmount,
        frozen_balance: wallet.frozen_balance + freezeAmount
      });
    } else if (action === 'unfreeze') {
      if (wallet.frozen_balance < freezeAmount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient frozen balance to unfreeze',
          code: 'INSUFFICIENT_FROZEN_BALANCE'
        });
      }
      
      await wallet.update({
        balance: wallet.balance + freezeAmount,
        frozen_balance: wallet.frozen_balance - freezeAmount
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "freeze" or "unfreeze"',
        code: 'INVALID_ACTION'
      });
    }

    // Log the action
    logger.info(`Wallet ${action} by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      user_id: id,
      wallet_id,
      currency: wallet.currency,
      amount: freezeAmount,
      action,
      reason: reason || 'No reason provided'
    });

    res.json({
      success: true,
      message: `Wallet balance ${action}d successfully`,
      data: {
        user_id: id,
        wallet_id,
        currency: wallet.currency,
        amount: freezeAmount,
        action,
        new_balance: wallet.balance + (action === 'freeze' ? -freezeAmount : freezeAmount),
        new_frozen_balance: wallet.frozen_balance + (action === 'freeze' ? freezeAmount : -freezeAmount),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Update wallet freeze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet freeze status',
      code: 'UPDATE_WALLET_FREEZE_FAILED'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  updateKYCStatus,
  resetUserPassword,
  getUserTransactions,
  updateWalletFreeze
};