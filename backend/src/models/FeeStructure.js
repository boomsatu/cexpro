const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Market = require('./Market');

/**
 * Model FeeStructure untuk mengelola struktur biaya trading
 * Mendukung fee tiers, volume-based discounts, dan special rates
 */
const FeeStructure = sequelize.define('FeeStructure', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Identifiers
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Name of the fee structure'
  },
  
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique code for the fee structure'
  },
  
  // Scope
  scope: {
    type: DataTypes.ENUM('global', 'user', 'pair', 'user_pair', 'vip_tier'),
    allowNull: false,
    defaultValue: 'global',
    comment: 'Scope of fee application'
  },
  
  // Foreign keys
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User reference (for user-specific fees)'
  },
  
  trading_pair_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'trading_pairs',
      key: 'id'
    },
    comment: 'Trading pair reference (for pair-specific fees)'
  },
  
  // Fee rates
  maker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0,
    comment: 'Maker fee rate (as decimal, e.g., 0.001 = 0.1%)'
  },
  
  taker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0,
    comment: 'Taker fee rate (as decimal, e.g., 0.001 = 0.1%)'
  },
  
  // Volume-based tiers
  min_volume_30d: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum 30-day volume for this tier'
  },
  
  max_volume_30d: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Maximum 30-day volume for this tier'
  },
  
  // VIP tier requirements
  vip_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'VIP level requirement (null for non-VIP)'
  },
  
  min_balance_requirement: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum balance requirement'
  },
  
  balance_currency: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Currency for balance requirement'
  },
  
  // Special fee types
  withdrawal_fee_type: {
    type: DataTypes.ENUM('fixed', 'percentage', 'tiered'),
    allowNull: false,
    defaultValue: 'fixed',
    comment: 'Type of withdrawal fee calculation'
  },
  
  withdrawal_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0,
    comment: 'Withdrawal fee rate'
  },
  
  withdrawal_min_fee: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum withdrawal fee'
  },
  
  withdrawal_max_fee: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Maximum withdrawal fee'
  },
  
  // Deposit fees
  deposit_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0,
    comment: 'Deposit fee rate'
  },
  
  deposit_min_fee: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum deposit fee'
  },
  
  // Margin trading fees
  margin_maker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Margin maker fee rate'
  },
  
  margin_taker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Margin taker fee rate'
  },
  
  // Futures trading fees
  futures_maker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Futures maker fee rate'
  },
  
  futures_taker_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Futures taker fee rate'
  },
  
  // Funding and borrowing
  funding_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Funding fee rate for perpetual contracts'
  },
  
  borrowing_fee_rate: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Borrowing fee rate for margin trading'
  },
  
  // Priority and status
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Priority level (higher number = higher priority)'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the fee structure is active'
  },
  
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is the default fee structure'
  },
  
  // Validity period
  valid_from: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the fee structure becomes valid'
  },
  
  valid_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the fee structure expires'
  },
  
  // Discounts and promotions
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    comment: 'Discount percentage (0.1 = 10% discount)'
  },
  
  promotion_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Promotion code associated with this fee structure'
  },
  
  referral_discount: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    comment: 'Additional discount for referrals'
  },
  
  // Fee sharing (for referrals)
  referrer_share_percentage: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    comment: 'Percentage of fees shared with referrer'
  },
  
  // Configuration
  fee_currency: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Currency in which fees are collected (null = quote currency)'
  },
  
  fee_collection_method: {
    type: DataTypes.ENUM('deduct_from_order', 'separate_charge', 'native_token'),
    allowNull: false,
    defaultValue: 'deduct_from_order',
    comment: 'How fees are collected'
  },
  
  // Metadata
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the fee structure'
  },
  
  terms_and_conditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Terms and conditions for this fee structure'
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
  tableName: 'fee_structures',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['code'],
      unique: true
    },
    {
      fields: ['scope', 'is_active']
    },
    {
      fields: ['user_id', 'is_active']
    },
    {
      fields: ['trading_pair_id', 'is_active']
    },
    {
      fields: ['vip_level']
    },
    {
      fields: ['min_volume_30d', 'max_volume_30d']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['valid_from', 'valid_until']
    },
    {
      fields: ['is_default']
    },
    {
      fields: ['promotion_code']
    }
  ],
  validate: {
    feeRatesValid() {
      if (parseFloat(this.maker_fee_rate) < 0 || parseFloat(this.taker_fee_rate) < 0) {
        throw new Error('Fee rates cannot be negative');
      }
    },
    volumeRangeValid() {
      if (this.min_volume_30d && this.max_volume_30d) {
        if (parseFloat(this.min_volume_30d) >= parseFloat(this.max_volume_30d)) {
          throw new Error('Minimum volume must be less than maximum volume');
        }
      }
    },
    validityPeriod() {
      if (this.valid_from && this.valid_until) {
        if (this.valid_from >= this.valid_until) {
          throw new Error('Valid from date must be before valid until date');
        }
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
FeeStructure.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// Associations are defined in models/index.js

// Instance methods
FeeStructure.prototype.isValid = function() {
  const now = new Date();
  
  if (!this.is_active) return false;
  if (this.valid_from && now < this.valid_from) return false;
  if (this.valid_until && now > this.valid_until) return false;
  
  return true;
};

FeeStructure.prototype.calculateTradingFee = function(orderValue, isMaker = true, tradeType = 'spot') {
  let feeRate;
  
  switch (tradeType) {
    case 'margin':
      feeRate = isMaker ? this.margin_maker_fee_rate : this.margin_taker_fee_rate;
      break;
    case 'futures':
      feeRate = isMaker ? this.futures_maker_fee_rate : this.futures_taker_fee_rate;
      break;
    default:
      feeRate = isMaker ? this.maker_fee_rate : this.taker_fee_rate;
  }
  
  if (!feeRate) {
    feeRate = isMaker ? this.maker_fee_rate : this.taker_fee_rate;
  }
  
  let baseFee = parseFloat(orderValue) * parseFloat(feeRate);
  
  // Apply discount if applicable
  if (this.discount_percentage) {
    baseFee *= (1 - parseFloat(this.discount_percentage));
  }
  
  return baseFee;
};

FeeStructure.prototype.calculateWithdrawalFee = function(amount, currency) {
  let fee = 0;
  
  switch (this.withdrawal_fee_type) {
    case 'fixed':
      fee = parseFloat(this.withdrawal_fee_rate);
      break;
    case 'percentage':
      fee = parseFloat(amount) * parseFloat(this.withdrawal_fee_rate);
      break;
    case 'tiered':
      // Implement tiered logic based on amount
      fee = parseFloat(amount) * parseFloat(this.withdrawal_fee_rate);
      break;
  }
  
  // Apply min/max limits
  if (this.withdrawal_min_fee && fee < parseFloat(this.withdrawal_min_fee)) {
    fee = parseFloat(this.withdrawal_min_fee);
  }
  
  if (this.withdrawal_max_fee && fee > parseFloat(this.withdrawal_max_fee)) {
    fee = parseFloat(this.withdrawal_max_fee);
  }
  
  return fee;
};

FeeStructure.prototype.calculateDepositFee = function(amount) {
  let fee = parseFloat(amount) * parseFloat(this.deposit_fee_rate);
  
  if (this.deposit_min_fee && fee < parseFloat(this.deposit_min_fee)) {
    fee = parseFloat(this.deposit_min_fee);
  }
  
  return fee;
};

FeeStructure.prototype.calculateReferrerShare = function(totalFee) {
  if (!this.referrer_share_percentage) return 0;
  return parseFloat(totalFee) * parseFloat(this.referrer_share_percentage);
};

FeeStructure.prototype.getEffectiveFeeRates = function(tradeType = 'spot') {
  const rates = {
    maker: this.maker_fee_rate,
    taker: this.taker_fee_rate
  };
  
  if (tradeType === 'margin') {
    rates.maker = this.margin_maker_fee_rate || this.maker_fee_rate;
    rates.taker = this.margin_taker_fee_rate || this.taker_fee_rate;
  } else if (tradeType === 'futures') {
    rates.maker = this.futures_maker_fee_rate || this.maker_fee_rate;
    rates.taker = this.futures_taker_fee_rate || this.taker_fee_rate;
  }
  
  // Apply discount
  if (this.discount_percentage) {
    const discountMultiplier = 1 - parseFloat(this.discount_percentage);
    rates.maker *= discountMultiplier;
    rates.taker *= discountMultiplier;
  }
  
  return rates;
};

// Static methods
FeeStructure.getApplicableFeeStructure = async function(userId, tradingPairId = null, tradeType = 'spot') {
  const where = {
    is_active: true,
    [sequelize.Op.or]: [
      { scope: 'global', is_default: true },
      { scope: 'user', user_id: userId },
      { scope: 'pair', trading_pair_id: tradingPairId },
      { scope: 'user_pair', user_id: userId, trading_pair_id: tradingPairId }
    ]
  };
  
  const now = new Date();
  where[sequelize.Op.and] = [
    {
      [sequelize.Op.or]: [
        { valid_from: null },
        { valid_from: { [sequelize.Op.lte]: now } }
      ]
    },
    {
      [sequelize.Op.or]: [
        { valid_until: null },
        { valid_until: { [sequelize.Op.gte]: now } }
      ]
    }
  ];
  
  const feeStructures = await FeeStructure.findAll({
    where,
    order: [['priority', 'DESC'], ['scope', 'DESC']]
  });
  
  return feeStructures.length > 0 ? feeStructures[0] : null;
};

FeeStructure.getVipTierFeeStructure = async function(vipLevel) {
  return await FeeStructure.findOne({
    where: {
      scope: 'vip_tier',
      vip_level: vipLevel,
      is_active: true
    }
  });
};

FeeStructure.getVolumeTierFeeStructure = async function(volume30d) {
  return await FeeStructure.findOne({
    where: {
      [sequelize.Op.and]: [
        {
          [sequelize.Op.or]: [
            { min_volume_30d: null },
            { min_volume_30d: { [sequelize.Op.lte]: volume30d } }
          ]
        },
        {
          [sequelize.Op.or]: [
            { max_volume_30d: null },
            { max_volume_30d: { [sequelize.Op.gt]: volume30d } }
          ]
        }
      ],
      is_active: true
    },
    order: [['priority', 'DESC']]
  });
};

FeeStructure.createDefaultStructure = async function(transaction = null) {
  return await FeeStructure.create({
    name: 'Default Fee Structure',
    code: 'DEFAULT',
    scope: 'global',
    maker_fee_rate: 0.001, // 0.1%
    taker_fee_rate: 0.001, // 0.1%
    withdrawal_fee_type: 'fixed',
    withdrawal_fee_rate: 0.0005,
    deposit_fee_rate: 0,
    is_default: true,
    description: 'Default fee structure for all users'
  }, { transaction });
};

FeeStructure.createVipTiers = async function(transaction = null) {
  const vipTiers = [
    { level: 1, maker: 0.0008, taker: 0.0008, minVolume: 100000 },
    { level: 2, maker: 0.0006, taker: 0.0006, minVolume: 500000 },
    { level: 3, maker: 0.0004, taker: 0.0004, minVolume: 1000000 },
    { level: 4, maker: 0.0002, taker: 0.0002, minVolume: 5000000 },
    { level: 5, maker: 0.0000, taker: 0.0001, minVolume: 10000000 }
  ];
  
  const createdTiers = [];
  
  for (const tier of vipTiers) {
    const feeStructure = await FeeStructure.create({
      name: `VIP Level ${tier.level}`,
      code: `VIP_${tier.level}`,
      scope: 'vip_tier',
      vip_level: tier.level,
      maker_fee_rate: tier.maker,
      taker_fee_rate: tier.taker,
      min_volume_30d: tier.minVolume,
      withdrawal_fee_type: 'fixed',
      withdrawal_fee_rate: 0.0005 * (1 - tier.level * 0.1), // Reduced withdrawal fees
      deposit_fee_rate: 0,
      priority: tier.level,
      description: `VIP Level ${tier.level} fee structure`
    }, { transaction });
    
    createdTiers.push(feeStructure);
  }
  
  return createdTiers;
};

module.exports = FeeStructure;