const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Market = require('./Market');
const User = require('./User');

/**
 * Model Order untuk mengelola semua trading orders
 * Mendukung berbagai tipe order dan status lifecycle
 */
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Order identification
  order_id: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: 'Unique order identifier for API'
  },
  
  // Foreign keys
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who placed the order'
  },
  
  market_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    },
    comment: 'Market where order is placed'
  },
  
  // Order basic information
  side: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false,
    comment: 'Order side: buy or sell'
  },
  
  type: {
    type: DataTypes.ENUM('market', 'limit', 'stop', 'stop_limit', 'trailing_stop'),
    allowNull: false,
    comment: 'Order type'
  },
  
  time_in_force: {
    type: DataTypes.ENUM('GTC', 'IOC', 'FOK', 'GTD'),
    defaultValue: 'GTC',
    allowNull: false,
    comment: 'Time in force: GTC=Good Till Cancelled, IOC=Immediate or Cancel, FOK=Fill or Kill, GTD=Good Till Date'
  },
  
  // Price and quantity
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Order price (null for market orders)'
  },
  
  quantity: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Original order quantity'
  },
  
  filled_quantity: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Quantity that has been filled'
  },
  
  remaining_quantity: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Remaining quantity to be filled'
  },
  
  // Stop order parameters
  stop_price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Stop price for stop orders'
  },
  
  trailing_amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Trailing amount for trailing stop orders'
  },
  
  trailing_percent: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    comment: 'Trailing percentage for trailing stop orders'
  },
  
  // Order status and lifecycle
  status: {
    type: DataTypes.ENUM(
      'pending',      // Order received but not yet processed
      'open',         // Order is active in order book
      'partially_filled', // Order is partially executed
      'filled',       // Order is completely executed
      'cancelled',    // Order was cancelled by user
      'rejected',     // Order was rejected by system
      'expired'       // Order expired (GTD orders)
    ),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current order status'
  },
  
  // Financial calculations
  average_price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Volume weighted average price of fills'
  },
  
  total_value: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Total value of filled quantity'
  },
  
  fee_amount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total fee paid for this order'
  },
  
  fee_currency: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Currency in which fee is paid'
  },
  
  // Order metadata
  client_order_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Client-provided order identifier'
  },
  
  source: {
    type: DataTypes.ENUM('web', 'mobile', 'api', 'admin'),
    defaultValue: 'web',
    allowNull: false,
    comment: 'Source of the order'
  },
  
  // Risk management
  risk_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Risk score assigned by risk management system'
  },
  
  is_margin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is a margin order'
  },
  
  leverage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Leverage used for margin orders'
  },
  
  // Timing
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration time for GTD orders'
  },
  
  filled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Time when order was completely filled'
  },
  
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Time when order was cancelled'
  },
  
  // Additional data
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or rejection reason'
  },

  // Enhanced fields
  order_source: {
    type: DataTypes.ENUM('manual', 'api', 'algo', 'copy_trading', 'bot'),
    defaultValue: 'manual',
    allowNull: false
  },
  
  margin_type: {
    type: DataTypes.ENUM('cross', 'isolated'),
    allowNull: true,
    comment: 'Margin type for margin orders'
  },
  
  position_side: {
    type: DataTypes.ENUM('long', 'short', 'both'),
    allowNull: true,
    comment: 'Position side for futures trading'
  },
  
  reduce_only: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this order can only reduce position size'
  },
  
  post_only: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this order should only be posted as maker'
  },
  
  iceberg_qty: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Visible quantity for iceberg orders'
  },
  
  strategy_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Associated trading strategy ID'
  },
  
  parent_order_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'Parent order for bracket/OCO orders'
  },
  
  order_group_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Group ID for related orders (OCO, bracket)'
  },
  
  trigger_price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Trigger price for conditional orders'
  },
  
  trigger_condition: {
    type: DataTypes.ENUM('>=', '<=', '=='),
    allowNull: true,
    comment: 'Trigger condition for conditional orders'
  },
  
  working_type: {
    type: DataTypes.ENUM('mark_price', 'contract_price'),
    allowNull: true,
    comment: 'Price type used for stop orders'
  },
  
  price_protect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether price protection is enabled'
  },
  
  self_trade_prevention: {
    type: DataTypes.ENUM('none', 'expire_taker', 'expire_maker', 'expire_both'),
    defaultValue: 'expire_taker',
    allowNull: false
  },
  
  commission_asset: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Asset used to pay commission'
  },
  
  commission_rate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Commission rate applied to this order'
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
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['order_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['market_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['side']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['market_id', 'status']
    },
    {
      fields: ['market_id', 'side', 'status']
    },
    {
      fields: ['price', 'created_at'] // For order book sorting
    }
  ]
});

// Associations
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Order.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

// Instance methods
Order.prototype.isActive = function() {
  return ['pending', 'open', 'partially_filled'].includes(this.status);
};

Order.prototype.isFilled = function() {
  return this.status === 'filled';
};

Order.prototype.isPartiallyFilled = function() {
  return this.status === 'partially_filled';
};

Order.prototype.canCancel = function() {
  return ['pending', 'open', 'partially_filled'].includes(this.status);
};

Order.prototype.canModify = function() {
  return ['pending', 'open'].includes(this.status);
};

Order.prototype.getFillPercentage = function() {
  if (parseFloat(this.quantity) === 0) return 0;
  return (parseFloat(this.filled_quantity) / parseFloat(this.quantity)) * 100;
};

Order.prototype.updateFill = function(fillQuantity, fillPrice) {
  const currentFilled = parseFloat(this.filled_quantity);
  const newFilled = currentFilled + parseFloat(fillQuantity);
  const totalQuantity = parseFloat(this.quantity);
  
  // Update filled quantity
  this.filled_quantity = newFilled;
  this.remaining_quantity = totalQuantity - newFilled;
  
  // Update average price (volume weighted)
  if (this.average_price) {
    const currentValue = currentFilled * parseFloat(this.average_price);
    const newValue = parseFloat(fillQuantity) * parseFloat(fillPrice);
    this.average_price = (currentValue + newValue) / newFilled;
  } else {
    this.average_price = fillPrice;
  }
  
  // Update total value
  this.total_value = newFilled * parseFloat(this.average_price);
  
  // Update status
  if (newFilled >= totalQuantity) {
    this.status = 'filled';
    this.filled_at = new Date();
  } else {
    this.status = 'partially_filled';
  }
};

Order.prototype.cancel = function(reason = null) {
  if (!this.canCancel()) {
    throw new Error('Order cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancelled_at = new Date();
  if (reason) {
    this.notes = reason;
  }
};

// Static methods
Order.generateOrderId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`.toUpperCase();
};

Order.getActiveOrders = async function(userId = null, marketId = null) {
  const where = {
    status: ['pending', 'open', 'partially_filled']
  };
  
  if (userId) where.user_id = userId;
  if (marketId) where.market_id = marketId;
  
  return await Order.findAll({
    where,
    include: [
      { model: Market, as: 'market' },
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
    ],
    order: [['created_at', 'DESC']]
  });
};

Order.getOrderHistory = async function(userId, limit = 50, offset = 0) {
  return await Order.findAndCountAll({
    where: { user_id: userId },
    include: [
      { model: Market, as: 'market' }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

Order.getOrderBook = async function(marketId, side = null, limit = 50) {
  const where = {
    market_id: marketId,
    status: ['open', 'partially_filled'],
    type: ['limit'] // Only limit orders appear in order book
  };
  
  if (side) where.side = side;
  
  const orderBy = side === 'buy' ? [['price', 'DESC'], ['created_at', 'ASC']] : [['price', 'ASC'], ['created_at', 'ASC']];
  
  return await Order.findAll({
    where,
    attributes: ['id', 'price', 'remaining_quantity', 'created_at'],
    order: orderBy,
    limit
  });
};

module.exports = Order;