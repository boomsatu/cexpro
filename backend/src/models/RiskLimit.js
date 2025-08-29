const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Market = require('./Market');

/**
 * Model RiskLimit untuk mengelola batas risiko trading
 * Mengatur exposure limits, position limits, dan trading restrictions
 */
const RiskLimit = sequelize.define('RiskLimit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign keys
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User reference (null for global limits)'
  },
  
  trading_pair_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'trading_pairs',
      key: 'id'
    },
    comment: 'Trading pair reference (null for all pairs)'
  },
  
  // Limit configuration
  limit_type: {
    type: DataTypes.ENUM(
      'daily_volume',
      'daily_trades',
      'position_size',
      'open_orders',
      'margin_exposure',
      'leverage',
      'concentration',
      'drawdown',
      'var_limit',
      'notional_limit'
    ),
    allowNull: false,
    comment: 'Type of risk limit'
  },
  
  scope: {
    type: DataTypes.ENUM('global', 'user', 'pair', 'user_pair'),
    allowNull: false,
    defaultValue: 'user',
    comment: 'Scope of the limit application'
  },
  
  // Limit values
  limit_value: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Maximum allowed value'
  },
  
  warning_threshold: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Warning threshold (percentage of limit)'
  },
  
  current_usage: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Current usage amount'
  },
  
  // Time-based limits
  time_window: {
    type: DataTypes.ENUM('1m', '5m', '15m', '1h', '4h', '1d', '7d', '30d'),
    allowNull: true,
    comment: 'Time window for the limit (null for static limits)'
  },
  
  reset_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the limit usage resets'
  },
  
  // Status and enforcement
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the limit is active'
  },
  
  is_breached: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the limit is currently breached'
  },
  
  breach_action: {
    type: DataTypes.ENUM('warn', 'block', 'reduce', 'liquidate'),
    allowNull: false,
    defaultValue: 'warn',
    comment: 'Action to take when limit is breached'
  },
  
  // Breach tracking
  breach_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times limit has been breached'
  },
  
  last_breach_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the limit was last breached'
  },
  
  breach_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Details about the breach incident'
  },
  
  // Configuration
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Priority level (higher number = higher priority)'
  },
  
  override_allowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether manual override is allowed'
  },
  
  override_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for override (if applicable)'
  },
  
  override_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User who authorized the override'
  },
  
  override_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the override expires'
  },
  
  // Metadata
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the risk limit'
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Tags for categorization'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata'
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
  tableName: 'risk_limits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'limit_type']
    },
    {
      fields: ['trading_pair_id', 'limit_type']
    },
    {
      fields: ['user_id', 'trading_pair_id', 'limit_type'],
      unique: true
    },
    {
      fields: ['scope', 'limit_type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_breached']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['reset_time']
    },
    {
      fields: ['last_breach_at']
    }
  ],
  validate: {
    limitValuePositive() {
      if (parseFloat(this.limit_value) <= 0) {
        throw new Error('Limit value must be positive');
      }
    },
    warningThresholdValid() {
      if (this.warning_threshold && parseFloat(this.warning_threshold) >= parseFloat(this.limit_value)) {
        throw new Error('Warning threshold must be less than limit value');
      }
    },
    scopeConsistency() {
      if (this.scope === 'user' && !this.user_id) {
        throw new Error('User ID required for user scope');
      }
      if (this.scope === 'pair' && !this.trading_pair_id) {
        throw new Error('Trading pair ID required for pair scope');
      }
      if (this.scope === 'user_pair' && (!this.user_id || !this.trading_pair_id)) {
        throw new Error('Both user ID and trading pair ID required for user_pair scope');
      }
    }
  }
});

// Associations
RiskLimit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// Associations are defined in models/index.js
RiskLimit.belongsTo(User, { foreignKey: 'override_by', as: 'overrideUser' });

// Instance methods
RiskLimit.prototype.getUsagePercentage = function() {
  if (parseFloat(this.limit_value) === 0) return 0;
  return (parseFloat(this.current_usage) / parseFloat(this.limit_value)) * 100;
};

RiskLimit.prototype.getRemainingCapacity = function() {
  return Math.max(0, parseFloat(this.limit_value) - parseFloat(this.current_usage));
};

RiskLimit.prototype.isWarningTriggered = function() {
  if (!this.warning_threshold) return false;
  return parseFloat(this.current_usage) >= parseFloat(this.warning_threshold);
};

RiskLimit.prototype.isLimitExceeded = function() {
  return parseFloat(this.current_usage) >= parseFloat(this.limit_value);
};

RiskLimit.prototype.canAccommodate = function(additionalUsage) {
  const newUsage = parseFloat(this.current_usage) + parseFloat(additionalUsage);
  return newUsage <= parseFloat(this.limit_value);
};

RiskLimit.prototype.updateUsage = async function(newUsage, transaction = null) {
  const oldUsage = parseFloat(this.current_usage);
  this.current_usage = newUsage;
  
  const wasBreached = this.is_breached;
  const isNowBreached = this.isLimitExceeded();
  
  if (!wasBreached && isNowBreached) {
    // New breach
    this.is_breached = true;
    this.breach_count += 1;
    this.last_breach_at = new Date();
    this.breach_details = {
      previous_usage: oldUsage,
      new_usage: newUsage,
      limit_value: this.limit_value,
      breach_time: new Date(),
      breach_type: 'usage_exceeded'
    };
  } else if (wasBreached && !isNowBreached) {
    // Breach resolved
    this.is_breached = false;
  }
  
  return await this.save({ transaction });
};

RiskLimit.prototype.resetUsage = async function(transaction = null) {
  this.current_usage = 0;
  this.is_breached = false;
  
  if (this.time_window) {
    this.reset_time = this.calculateNextResetTime();
  }
  
  return await this.save({ transaction });
};

RiskLimit.prototype.calculateNextResetTime = function() {
  if (!this.time_window) return null;
  
  const now = new Date();
  const timeWindowMap = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const intervalMs = timeWindowMap[this.time_window];
  return new Date(now.getTime() + intervalMs);
};

RiskLimit.prototype.applyOverride = async function(overrideBy, reason, expiresAt = null, transaction = null) {
  if (!this.override_allowed) {
    throw new Error('Override not allowed for this limit');
  }
  
  this.override_by = overrideBy;
  this.override_reason = reason;
  this.override_expires_at = expiresAt;
  this.is_breached = false; // Temporarily clear breach status
  
  return await this.save({ transaction });
};

RiskLimit.prototype.isOverrideActive = function() {
  if (!this.override_by) return false;
  if (!this.override_expires_at) return true;
  return new Date() < this.override_expires_at;
};

// Static methods
RiskLimit.checkLimits = async function(userId, tradingPairId = null, limitTypes = null) {
  const where = {
    is_active: true,
    [sequelize.Op.or]: [
      { user_id: userId },
      { user_id: null, scope: 'global' }
    ]
  };
  
  if (tradingPairId) {
    where[sequelize.Op.or].push(
      { trading_pair_id: tradingPairId, scope: 'pair' },
      { user_id: userId, trading_pair_id: tradingPairId, scope: 'user_pair' }
    );
  }
  
  if (limitTypes) {
    where.limit_type = { [sequelize.Op.in]: limitTypes };
  }
  
  return await RiskLimit.findAll({
    where,
    order: [['priority', 'DESC']]
  });
};

RiskLimit.getBreachedLimits = async function(userId = null) {
  const where = {
    is_breached: true,
    is_active: true
  };
  
  if (userId) {
    where.user_id = userId;
  }
  
  return await RiskLimit.findAll({
    where,
    include: [
      { model: User, as: 'user' },
      { model: Market, as: 'tradingPair' }
    ],
    order: [['last_breach_at', 'DESC']]
  });
};

RiskLimit.resetExpiredLimits = async function() {
  const now = new Date();
  
  const expiredLimits = await RiskLimit.findAll({
    where: {
      reset_time: { [sequelize.Op.lte]: now },
      is_active: true
    }
  });
  
  const resetPromises = expiredLimits.map(limit => limit.resetUsage());
  return await Promise.all(resetPromises);
};

RiskLimit.createUserLimits = async function(userId, limitConfig, transaction = null) {
  const limits = [];
  
  for (const config of limitConfig) {
    const limit = await RiskLimit.create({
      user_id: userId,
      trading_pair_id: config.trading_pair_id || null,
      limit_type: config.limit_type,
      scope: config.scope || 'user',
      limit_value: config.limit_value,
      warning_threshold: config.warning_threshold || null,
      time_window: config.time_window || null,
      breach_action: config.breach_action || 'warn',
      priority: config.priority || 1,
      override_allowed: config.override_allowed || false,
      description: config.description || null
    }, { transaction });
    
    limits.push(limit);
  }
  
  return limits;
};

RiskLimit.validateTrade = async function(userId, tradingPairId, tradeAmount, tradeType = 'spot') {
  const limits = await RiskLimit.checkLimits(userId, tradingPairId, [
    'daily_volume',
    'position_size',
    'notional_limit'
  ]);
  
  const violations = [];
  
  for (const limit of limits) {
    if (!limit.canAccommodate(tradeAmount)) {
      violations.push({
        limit_id: limit.id,
        limit_type: limit.limit_type,
        current_usage: limit.current_usage,
        limit_value: limit.limit_value,
        requested_amount: tradeAmount,
        breach_action: limit.breach_action
      });
    }
  }
  
  return {
    allowed: violations.length === 0,
    violations: violations
  };
};

module.exports = RiskLimit;