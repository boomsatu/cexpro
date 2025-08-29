const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model Balance untuk mengelola saldo pengguna
 * Menyimpan saldo available dan locked untuk setiap mata uang
 */
const Balance = sequelize.define('Balance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign key
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who owns this balance'
  },
  
  // Currency information
  currency_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cryptocurrencies',
      key: 'id'
    },
    comment: 'Currency reference to cryptocurrencies table'
  },
  
  // Balance amounts
  available_balance: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Available balance for trading/withdrawal'
  },
  
  locked_balance: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Locked balance (in orders, pending withdrawals, etc.)'
  },
  
  // Calculated total
  total_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total balance (available + locked) - computed column in database'
  },
  
  // Balance tracking
  last_deposit_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last deposit timestamp'
  },
  
  last_withdrawal_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last withdrawal timestamp'
  },
  
  last_trade_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last trade timestamp'
  },
  
  // Security and compliance
  is_frozen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this balance is frozen'
  },
  
  freeze_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for balance freeze'
  },
  
  frozen_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When balance was frozen'
  },
  
  frozen_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin user who froze the balance'
  },
  
  // Minimum balance requirements
  min_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Minimum balance requirement'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional balance metadata'
  },

  // Enhanced fields
  margin_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Balance available for margin trading'
  },
  
  futures_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Balance in futures wallet'
  },
  
  staking_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Balance locked in staking'
  },
  
  lending_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Balance in lending/savings'
  },
  
  unrealized_pnl: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Unrealized profit/loss from open positions'
  },
  
  realized_pnl: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Realized profit/loss from closed positions'
  },
  
  total_deposits: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total lifetime deposits'
  },
  
  total_withdrawals: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total lifetime withdrawals'
  },
  
  total_trading_fees: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total trading fees paid in this currency'
  },
  
  average_buy_price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Average buy price for position tracking'
  },
  
  position_size: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Current position size (for futures/margin)'
  },
  
  position_side: {
    type: DataTypes.ENUM('long', 'short', 'both'),
    allowNull: true,
    comment: 'Position side for futures trading'
  },
  
  isolated_margin: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Isolated margin balance'
  },
  
  cross_margin: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Cross margin balance'
  },
  
  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'user_balances',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'currency_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['currency_id']
    },
    {
      fields: ['is_frozen']
    },
    {
      fields: ['available_balance'] // For balance queries
    },
    {
      fields: ['locked_balance'] // For locked balance queries
    }
  ],
  validate: {
    // Ensure balances are not negative
    positiveBalances() {
      if (parseFloat(this.available_balance) < 0) {
        throw new Error('Available balance cannot be negative');
      }
      if (parseFloat(this.locked_balance) < 0) {
        throw new Error('Locked balance cannot be negative');
      }
    }
  }
});

// Associations
Balance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Balance.belongsTo(User, { foreignKey: 'frozen_by', as: 'frozenBy' });
// Note: Cryptocurrency association will be defined in the Cryptocurrency model to avoid circular dependency

// Instance methods
Balance.prototype.hasAvailableBalance = function(amount) {
  return parseFloat(this.available_balance) >= parseFloat(amount);
};

Balance.prototype.hasTotalBalance = function(amount) {
  return parseFloat(this.total_balance) >= parseFloat(amount);
};

Balance.prototype.canWithdraw = function(amount) {
  return !this.is_frozen && this.hasAvailableBalance(amount);
};

Balance.prototype.canTrade = function(amount) {
  return !this.is_frozen && this.hasAvailableBalance(amount);
};

Balance.prototype.lockBalance = async function(amount, reason = null) {
  if (!this.hasAvailableBalance(amount)) {
    throw new Error('Insufficient available balance');
  }
  
  const lockAmount = parseFloat(amount);
  this.available_balance = parseFloat(this.available_balance) - lockAmount;
  this.locked_balance = parseFloat(this.locked_balance) + lockAmount;
  
  if (reason) {
    this.metadata = {
      ...this.metadata,
      last_lock_reason: reason,
      last_lock_at: new Date()
    };
  }
  
  await this.save();
  return this;
};

Balance.prototype.unlockBalance = async function(amount, reason = null) {
  const unlockAmount = parseFloat(amount);
  
  if (parseFloat(this.locked_balance) < unlockAmount) {
    throw new Error('Insufficient locked balance');
  }
  
  this.locked_balance = parseFloat(this.locked_balance) - unlockAmount;
  this.available_balance = parseFloat(this.available_balance) + unlockAmount;
  
  if (reason) {
    this.metadata = {
      ...this.metadata,
      last_unlock_reason: reason,
      last_unlock_at: new Date()
    };
  }
  
  await this.save();
  return this;
};

Balance.prototype.addBalance = async function(amount, type = 'available') {
  const addAmount = parseFloat(amount);
  
  if (type === 'available') {
    this.available_balance = parseFloat(this.available_balance) + addAmount;
  } else if (type === 'locked') {
    this.locked_balance = parseFloat(this.locked_balance) + addAmount;
  } else {
    throw new Error('Invalid balance type');
  }
  
  await this.save();
  return this;
};

Balance.prototype.subtractBalance = async function(amount, type = 'available') {
  const subtractAmount = parseFloat(amount);
  
  if (type === 'available') {
    if (parseFloat(this.available_balance) < subtractAmount) {
      throw new Error('Insufficient available balance');
    }
    this.available_balance = parseFloat(this.available_balance) - subtractAmount;
  } else if (type === 'locked') {
    if (parseFloat(this.locked_balance) < subtractAmount) {
      throw new Error('Insufficient locked balance');
    }
    this.locked_balance = parseFloat(this.locked_balance) - subtractAmount;
  } else {
    throw new Error('Invalid balance type');
  }
  
  await this.save();
  return this;
};

Balance.prototype.freeze = async function(reason, frozenBy) {
  this.is_frozen = true;
  this.freeze_reason = reason;
  this.frozen_at = new Date();
  this.frozen_by = frozenBy;
  
  await this.save();
  return this;
};

Balance.prototype.unfreeze = async function() {
  this.is_frozen = false;
  this.freeze_reason = null;
  this.frozen_at = null;
  this.frozen_by = null;
  
  await this.save();
  return this;
};

// Static methods
Balance.getUserBalance = async function(userId, currencyId) {
  return await Balance.findOne({
    where: {
      user_id: userId,
      currency_id: currencyId
    }
  });
};

Balance.getUserBalances = async function(userId) {
  return await Balance.findAll({
    where: { user_id: userId },
    include: [{
      model: sequelize.models.Cryptocurrency,
      as: 'currency',
      attributes: ['symbol', 'name', 'type']
    }],
    order: [['currency_id', 'ASC']]
  });
};

Balance.createOrUpdateBalance = async function(userId, currencyId, availableAmount = 0, lockedAmount = 0) {
  const [balance, created] = await Balance.findOrCreate({
    where: {
      user_id: userId,
      currency_id: currencyId
    },
    defaults: {
      available_balance: availableAmount,
      locked_balance: lockedAmount
    }
  });
  
  if (!created && (availableAmount !== 0 || lockedAmount !== 0)) {
    balance.available_balance = parseFloat(balance.available_balance) + parseFloat(availableAmount);
    balance.locked_balance = parseFloat(balance.locked_balance) + parseFloat(lockedAmount);
    await balance.save();
  }
  
  return balance;
};

Balance.getTotalBalanceValue = async function(userId, quoteCurrency = 'USDT') {
  // This would typically integrate with price service to calculate total portfolio value
  // For now, we'll return the balances without conversion
  const balances = await Balance.getUserBalances(userId);
  
  return balances.map(balance => ({
    currency_id: balance.currency_id,
    available: balance.available_balance,
    locked: balance.locked_balance,
    total: balance.total_balance,
    // value_in_quote: balance.total_balance * price // Would need price service integration
  }));
};

Balance.getFrozenBalances = async function(userId = null) {
  const where = { is_frozen: true };
  
  if (userId) {
    where.user_id = userId;
  }
  
  return await Balance.findAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
      { model: User, as: 'frozenBy', attributes: ['id', 'username'] }
    ],
    order: [['frozen_at', 'DESC']]
  });
};

// Transfer between users (for internal transfers)
Balance.transfer = async function(fromUserId, toUserId, currencyId, amount, reason = null) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get sender balance
    const fromBalance = await Balance.getUserBalance(fromUserId, currencyId);
    if (!fromBalance || !fromBalance.hasAvailableBalance(amount)) {
      throw new Error('Insufficient balance for transfer');
    }
    
    // Get or create receiver balance
    const toBalance = await Balance.createOrUpdateBalance(toUserId, currencyId, 0, 0);
    
    // Perform transfer
    await fromBalance.subtractBalance(amount, 'available');
    await toBalance.addBalance(amount, 'available');
    
    // Update metadata
    const transferMetadata = {
      transfer_reason: reason,
      transfer_at: new Date(),
      transfer_amount: amount
    };
    
    fromBalance.metadata = { ...fromBalance.metadata, last_transfer_out: transferMetadata };
    toBalance.metadata = { ...toBalance.metadata, last_transfer_in: transferMetadata };
    
    await fromBalance.save({ transaction });
    await toBalance.save({ transaction });
    
    await transaction.commit();
    
    return {
      from: fromBalance,
      to: toBalance,
      amount,
      currency_id: currencyId
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = Balance;