const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Market = require('./Market');

/**
 * Model MarketData untuk menyimpan data OHLCV (candlestick)
 * Menyimpan data historis harga untuk analisis teknikal
 */
const MarketData = sequelize.define('MarketData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign key
  trading_pair_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'trading_pairs',
      key: 'id'
    },
    comment: 'Trading pair reference'
  },
  
  // Time information
  timeframe: {
    type: DataTypes.ENUM('1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'),
    allowNull: false,
    comment: 'Candlestick timeframe'
  },
  
  open_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Candle open time'
  },
  
  close_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Candle close time'
  },
  
  // OHLCV data
  open_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Opening price'
  },
  
  high_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Highest price'
  },
  
  low_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Lowest price'
  },
  
  close_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Closing price'
  },
  
  volume: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Trading volume in base currency'
  },
  
  quote_volume: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Trading volume in quote currency'
  },
  
  // Additional metrics
  trades_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of trades in this candle'
  },
  
  taker_buy_volume: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Taker buy volume in base currency'
  },
  
  taker_buy_quote_volume: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Taker buy volume in quote currency'
  },
  
  // Technical indicators (can be calculated and stored)
  vwap: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Volume Weighted Average Price'
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
  tableName: 'market_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['trading_pair_id', 'timeframe', 'open_time']
    },
    {
      fields: ['trading_pair_id', 'timeframe']
    },
    {
      fields: ['open_time']
    },
    {
      fields: ['close_time']
    },
    {
      fields: ['volume']
    }
  ]
});

// Associations
// Associations are defined in models/index.js

// Instance methods
MarketData.prototype.getPriceChange = function() {
  return parseFloat(this.close_price) - parseFloat(this.open_price);
};

MarketData.prototype.getPriceChangePercent = function() {
  const change = this.getPriceChange();
  return (change / parseFloat(this.open_price)) * 100;
};

MarketData.prototype.getBodySize = function() {
  return Math.abs(parseFloat(this.close_price) - parseFloat(this.open_price));
};

MarketData.prototype.getUpperShadow = function() {
  const bodyTop = Math.max(parseFloat(this.open_price), parseFloat(this.close_price));
  return parseFloat(this.high_price) - bodyTop;
};

MarketData.prototype.getLowerShadow = function() {
  const bodyBottom = Math.min(parseFloat(this.open_price), parseFloat(this.close_price));
  return bodyBottom - parseFloat(this.low_price);
};

MarketData.prototype.isBullish = function() {
  return parseFloat(this.close_price) > parseFloat(this.open_price);
};

MarketData.prototype.isBearish = function() {
  return parseFloat(this.close_price) < parseFloat(this.open_price);
};

// Static methods
MarketData.getCandles = async function(tradingPairId, timeframe, limit = 500, startTime = null, endTime = null) {
  const where = {
    trading_pair_id: tradingPairId,
    timeframe: timeframe
  };
  
  if (startTime) {
    where.open_time = { [sequelize.Op.gte]: startTime };
  }
  
  if (endTime) {
    where.close_time = { [sequelize.Op.lte]: endTime };
  }
  
  return await MarketData.findAll({
    where,
    order: [['open_time', 'ASC']],
    limit
  });
};

MarketData.getLatestCandle = async function(tradingPairId, timeframe) {
  return await MarketData.findOne({
    where: {
      trading_pair_id: tradingPairId,
      timeframe: timeframe
    },
    order: [['open_time', 'DESC']]
  });
};

MarketData.createOrUpdateCandle = async function(candleData) {
  const [candle, created] = await MarketData.findOrCreate({
    where: {
      trading_pair_id: candleData.trading_pair_id,
      timeframe: candleData.timeframe,
      open_time: candleData.open_time
    },
    defaults: candleData
  });
  
  if (!created) {
    // Update existing candle with new data
    await candle.update({
      high_price: Math.max(parseFloat(candle.high_price), parseFloat(candleData.high_price)),
      low_price: Math.min(parseFloat(candle.low_price), parseFloat(candleData.low_price)),
      close_price: candleData.close_price,
      volume: parseFloat(candle.volume) + parseFloat(candleData.volume || 0),
      quote_volume: parseFloat(candle.quote_volume) + parseFloat(candleData.quote_volume || 0),
      trades_count: candle.trades_count + (candleData.trades_count || 0),
      taker_buy_volume: parseFloat(candle.taker_buy_volume) + parseFloat(candleData.taker_buy_volume || 0),
      taker_buy_quote_volume: parseFloat(candle.taker_buy_quote_volume) + parseFloat(candleData.taker_buy_quote_volume || 0)
    });
  }
  
  return candle;
};

MarketData.calculateVWAP = async function(tradingPairId, timeframe, periods = 20) {
  const candles = await MarketData.findAll({
    where: {
      trading_pair_id: tradingPairId,
      timeframe: timeframe
    },
    order: [['open_time', 'DESC']],
    limit: periods
  });
  
  if (candles.length === 0) return null;
  
  let totalVolume = 0;
  let totalVolumePrice = 0;
  
  candles.forEach(candle => {
    const typicalPrice = (parseFloat(candle.high_price) + parseFloat(candle.low_price) + parseFloat(candle.close_price)) / 3;
    const volume = parseFloat(candle.volume);
    
    totalVolumePrice += typicalPrice * volume;
    totalVolume += volume;
  });
  
  return totalVolume > 0 ? totalVolumePrice / totalVolume : null;
};

module.exports = MarketData;