const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Market = require('./Market');
const User = require('./User');
const Order = require('./Order');

/**
 * Model Trade untuk mencatat semua transaksi yang terjadi
 * Setiap trade adalah hasil dari matching antara buy dan sell order
 */
const Trade = sequelize.define('Trade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign keys
  trading_pair_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'trading_pairs',
      key: 'id'
    },
    comment: 'Trading pair where trade occurred'
  },
  
  // Order references
  buyer_order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'Buy order reference'
  },
  
  seller_order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'Sell order reference'
  },
  
  // User references
  buyer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Buyer user ID'
  },
  
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Seller user ID'
  },
  
  price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Trade execution price'
  },
  
  quantity: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Trade quantity'
  },
  
  total_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Total amount (price * quantity) - generated column'
  },
  
  // Fee information
  buyer_fee: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: true,
    comment: 'Fee paid by buyer'
  },
  
  seller_fee: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: true,
    comment: 'Fee paid by seller'
  },
  
  // Timestamps
  trade_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
    comment: 'When the trade occurred'
  },
  
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
    comment: 'When the record was created'
  },

  // Enhanced trading fields
  trade_type: {
    type: DataTypes.ENUM('spot', 'margin', 'futures', 'options'),
    defaultValue: 'spot',
    allowNull: false
  },
  
  liquidity_type: {
    type: DataTypes.ENUM('maker', 'taker'),
    allowNull: false,
    comment: 'Whether the trade was maker or taker'
  },
  
  buyer_commission: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Commission paid by buyer'
  },
  
  seller_commission: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Commission paid by seller'
  },
  
  buyer_commission_asset: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Asset used for buyer commission'
  },
  
  seller_commission_asset: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Asset used for seller commission'
  },
  
  is_buyer_maker: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    comment: 'Whether buyer was the maker'
  },
  
  trade_sequence: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Sequential trade number for ordering'
  },
  
  settlement_status: {
    type: DataTypes.ENUM('pending', 'settled', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  settlement_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the trade was settled'
  },
  
  market_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Market price at time of trade'
  },
  
  price_deviation: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Price deviation from market price (%)'
  }
}, {
  tableName: 'trades',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No updated_at column in database
  indexes: [
    {
      fields: ['trading_pair_id']
    },
    {
      fields: ['buyer_id']
    },
    {
      fields: ['seller_id']
    },
    {
      fields: ['buyer_order_id']
    },
    {
      fields: ['seller_order_id']
    },
    {
      fields: ['trade_time']
    },
    {
      fields: ['price'] // For market data queries
    },
    {
      fields: ['quantity'] // For volume calculations
    }
  ]
});

// Associations are defined in models/index.js

// Instance methods
Trade.prototype.getTradeValue = function() {
  return parseFloat(this.price) * parseFloat(this.quantity);
};

Trade.prototype.getTotalFees = function() {
  return parseFloat(this.buyer_fee || 0) + parseFloat(this.seller_fee || 0);
};

// Static methods
Trade.getTradeHistory = async function(tradingPairId = null, userId = null, limit = 50, offset = 0) {
  const where = {};
  
  if (tradingPairId) where.trading_pair_id = tradingPairId;
  if (userId) {
    where[sequelize.Op.or] = [
      { buyer_id: userId },
      { seller_id: userId }
    ];
  }
  
  return await Trade.findAndCountAll({
    where,
    include: [
      { model: Market, as: 'tradingPair', attributes: ['symbol', 'base_currency', 'quote_currency'] }
    ],
    order: [['trade_time', 'DESC']],
    limit,
    offset
  });
};

Trade.getRecentTrades = async function(tradingPairId, limit = 50) {
  return await Trade.findAll({
    where: { trading_pair_id: tradingPairId },
    attributes: ['id', 'price', 'quantity', 'trade_time'],
    order: [['trade_time', 'DESC']],
    limit
  });
};

Trade.getMarketStats24h = async function(tradingPairId) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const stats = await Trade.findAll({
    where: {
      trading_pair_id: tradingPairId,
      trade_time: {
        [sequelize.Op.gte]: twentyFourHoursAgo
      }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'trade_count'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'volume'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'volume_quote'],
      [sequelize.fn('MIN', sequelize.col('price')), 'low'],
      [sequelize.fn('MAX', sequelize.col('price')), 'high'],
      [sequelize.fn('AVG', sequelize.col('price')), 'avg_price']
    ],
    raw: true
  });
  
  // Get first and last trade for price change calculation
  const firstTrade = await Trade.findOne({
    where: {
      trading_pair_id: tradingPairId,
      trade_time: {
        [sequelize.Op.gte]: twentyFourHoursAgo
      }
    },
    order: [['trade_time', 'ASC']],
    attributes: ['price']
  });
  
  const lastTrade = await Trade.findOne({
    where: {
      trading_pair_id: tradingPairId,
      trade_time: {
        [sequelize.Op.gte]: twentyFourHoursAgo
      }
    },
    order: [['trade_time', 'DESC']],
    attributes: ['price']
  });
  
  const result = stats[0] || {};
  
  if (firstTrade && lastTrade) {
    const priceChange = parseFloat(lastTrade.price) - parseFloat(firstTrade.price);
    const priceChangePercent = (priceChange / parseFloat(firstTrade.price)) * 100;
    
    result.price_change = priceChange;
    result.price_change_percent = priceChangePercent;
    result.open_price = firstTrade.price;
    result.close_price = lastTrade.price;
  }
  
  return result;
};

Trade.getCandlestickData = async function(marketId, interval = '1h', limit = 100) {
  // This would typically be implemented with time-series aggregation
  // For now, we'll provide a basic implementation
  const intervalMs = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }[interval] || 60 * 60 * 1000;
  
  const startTime = new Date(Date.now() - (limit * intervalMs));
  
  return await sequelize.query(`
    SELECT 
      date_trunc('hour', executed_at) as time,
      (array_agg(price ORDER BY executed_at ASC))[1] as open,
      MAX(price) as high,
      MIN(price) as low,
      (array_agg(price ORDER BY executed_at DESC))[1] as close,
      SUM(quantity) as volume,
      SUM(value) as volume_quote,
      COUNT(*) as trade_count
    FROM trades 
    WHERE market_id = :marketId 
      AND executed_at >= :startTime
    GROUP BY date_trunc('hour', executed_at)
    ORDER BY time DESC
    LIMIT :limit
  `, {
    replacements: { marketId, startTime, limit },
    type: sequelize.QueryTypes.SELECT
  });
};

module.exports = Trade;