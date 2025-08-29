const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Market untuk mengelola trading pairs
 * Menyimpan informasi tentang pasangan trading yang tersedia di exchange
 */
const Market = sequelize.define('Market', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Trading pair information
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Trading pair symbol (e.g., BTC/USDT)'
  },
  
  base_currency_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Base currency ID (foreign key to cryptocurrencies table)'
  },
  
  quote_currency_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Quote currency ID (foreign key to cryptocurrencies table)'
  },
  
  // Market configuration
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Market trading status'
  },
  
  // Price and quantity precision
  price_precision: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    allowNull: false,
    comment: 'Number of decimal places for price'
  },
  
  quantity_precision: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    allowNull: false,
    comment: 'Number of decimal places for quantity'
  },
  
  // Trading limits
  min_order_size: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0.000000000000000001,
    comment: 'Minimum order size in base currency'
  },
  
  max_order_size: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Maximum order size in base currency (null = no limit)'
  },
  
  
  // Fee structure
  maker_fee: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.001,
    allowNull: false,
    comment: 'Maker fee percentage (0.001 = 0.1%)'
  },
  
  taker_fee: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.002,
    allowNull: false,
    comment: 'Taker fee percentage (0.002 = 0.2%)'
  },

  // Enhanced trading parameters
  tick_size: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0.000000000000000001,
    comment: 'Minimum price increment'
  },
  
  lot_size: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0.000000000000000001,
    comment: 'Minimum quantity increment'
  },
  
  price_filter_min: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum allowed price'
  },
  
  price_filter_max: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Maximum allowed price'
  },
  
  min_notional: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 10,
    comment: 'Minimum order value (price * quantity)'
  },
  
  max_notional: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Maximum order value (price * quantity)'
  },
  
  // Market status and configuration
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'delisted'),
    defaultValue: 'active',
    allowNull: false
  },
  
  trading_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  margin_trading_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  // Market statistics
  volume_24h: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false
  },
  
  quote_volume_24h: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false
  },
  
  high_24h: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  
  low_24h: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  
  last_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  
  price_change_24h: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false
  },
  
  price_change_percent_24h: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0,
    allowNull: false
  },
  
  trades_count_24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  // Liquidity and market making
  market_maker_program: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  liquidity_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
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
  tableName: 'trading_pairs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['symbol']
    },
    {
      fields: ['base_currency']
    },
    {
      fields: ['quote_currency']
    },
    {
      fields: ['status']
    },
    {
      fields: ['volume_24h']
    }
  ]
});

// Instance methods
Market.prototype.isActive = function() {
  return this.is_active === true;
};

Market.prototype.canTrade = function() {
  return ['active'].includes(this.status);
};

Market.prototype.formatPrice = function(price) {
  return parseFloat(price).toFixed(this.price_precision);
};

Market.prototype.formatQuantity = function(quantity) {
  return parseFloat(quantity).toFixed(this.quantity_precision);
};

Market.prototype.validateOrderSize = function(quantity, price) {
  const notional = parseFloat(quantity) * parseFloat(price);
  
  if (parseFloat(quantity) < parseFloat(this.min_order_size)) {
    return {
      valid: false,
      error: `Order size below minimum: ${this.min_order_size}`
    };
  }
  
  if (this.max_order_size && parseFloat(quantity) > parseFloat(this.max_order_size)) {
    return {
      valid: false,
      error: `Order size above maximum: ${this.max_order_size}`
    };
  }
  
  if (notional < parseFloat(this.min_notional)) {
    return {
      valid: false,
      error: `Order notional below minimum: ${this.min_notional}`
    };
  }
  
  return { valid: true };
};

// Static methods
Market.getActiveMarkets = async function() {
  return await Market.findAll({
    where: { is_active: true },
    order: [['volume_24h', 'DESC']]
  });
};

Market.getMarketBySymbol = async function(symbol) {
  return await Market.findOne({
    where: { symbol: symbol.toUpperCase() }
  });
};

Market.getMarketsByBaseCurrency = async function(baseCurrency) {
  return await Market.findAll({
    where: { 
      base_currency: baseCurrency.toUpperCase(),
      is_active: true
    },
    order: [['volume_24h', 'DESC']]
  });
};

Market.getMarketsByQuoteCurrency = async function(quoteCurrency) {
  return await Market.findAll({
    where: { 
      quote_currency: quoteCurrency.toUpperCase(),
      is_active: true
    },
    order: [['volume_24h', 'DESC']]
  });
};

module.exports = Market;