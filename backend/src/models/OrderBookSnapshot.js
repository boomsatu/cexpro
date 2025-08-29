const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Market = require('./Market');

/**
 * Model OrderBookSnapshot untuk menyimpan snapshot order book
 * Berguna untuk analisis likuiditas dan rekonstruksi order book historis
 */
const OrderBookSnapshot = sequelize.define('OrderBookSnapshot', {
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
  
  // Snapshot metadata
  snapshot_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the snapshot was taken'
  },
  
  sequence_number: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Sequence number for ordering snapshots'
  },
  
  // Order book data
  bids: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Buy orders array [[price, quantity], ...]'
  },
  
  asks: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Sell orders array [[price, quantity], ...]'
  },
  
  // Calculated metrics
  best_bid: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Highest bid price'
  },
  
  best_ask: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Lowest ask price'
  },
  
  spread: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Bid-ask spread'
  },
  
  spread_percent: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Bid-ask spread percentage'
  },
  
  bid_depth: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total bid volume'
  },
  
  ask_depth: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total ask volume'
  },
  
  total_depth: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total order book depth'
  },
  
  // Liquidity metrics
  liquidity_score: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Calculated liquidity score'
  },
  
  market_impact_1pct: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Market impact for 1% of daily volume'
  },
  
  // Order book imbalance
  imbalance_ratio: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Bid/ask volume imbalance ratio'
  },
  
  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'order_book_snapshots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['trading_pair_id', 'snapshot_time']
    },
    {
      fields: ['trading_pair_id', 'sequence_number']
    },
    {
      fields: ['snapshot_time']
    },
    {
      fields: ['sequence_number']
    },
    {
      fields: ['best_bid']
    },
    {
      fields: ['best_ask']
    }
  ]
});

// Associations
// Associations are defined in models/index.js

// Instance methods
OrderBookSnapshot.prototype.getMidPrice = function() {
  if (!this.best_bid || !this.best_ask) return null;
  return (parseFloat(this.best_bid) + parseFloat(this.best_ask)) / 2;
};

OrderBookSnapshot.prototype.getSpreadBps = function() {
  if (!this.spread_percent) return null;
  return parseFloat(this.spread_percent) * 100; // Convert to basis points
};

OrderBookSnapshot.prototype.getBidAskRatio = function() {
  if (parseFloat(this.ask_depth) === 0) return null;
  return parseFloat(this.bid_depth) / parseFloat(this.ask_depth);
};

OrderBookSnapshot.prototype.getTopNLevels = function(n = 10) {
  return {
    bids: this.bids.slice(0, n),
    asks: this.asks.slice(0, n)
  };
};

OrderBookSnapshot.prototype.calculateMarketImpact = function(orderSize, side = 'buy') {
  const orders = side === 'buy' ? this.asks : this.bids;
  let remainingSize = parseFloat(orderSize);
  let totalCost = 0;
  let weightedPrice = 0;
  
  for (const [price, quantity] of orders) {
    const levelPrice = parseFloat(price);
    const levelQuantity = parseFloat(quantity);
    
    if (remainingSize <= 0) break;
    
    const fillQuantity = Math.min(remainingSize, levelQuantity);
    totalCost += fillQuantity * levelPrice;
    remainingSize -= fillQuantity;
  }
  
  if (remainingSize > 0) {
    // Not enough liquidity
    return null;
  }
  
  weightedPrice = totalCost / parseFloat(orderSize);
  const midPrice = this.getMidPrice();
  
  if (!midPrice) return null;
  
  return {
    weighted_price: weightedPrice,
    market_impact: Math.abs(weightedPrice - midPrice) / midPrice,
    slippage: (weightedPrice - midPrice) / midPrice
  };
};

// Static methods
OrderBookSnapshot.createSnapshot = async function(tradingPairId, bids, asks, sequenceNumber) {
  // Calculate metrics
  const bestBid = bids.length > 0 ? parseFloat(bids[0][0]) : null;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0][0]) : null;
  
  const spread = (bestBid && bestAsk) ? bestAsk - bestBid : null;
  const spreadPercent = (spread && bestBid) ? (spread / bestBid) * 100 : null;
  
  const bidDepth = bids.reduce((sum, [price, qty]) => sum + parseFloat(qty), 0);
  const askDepth = asks.reduce((sum, [price, qty]) => sum + parseFloat(qty), 0);
  const totalDepth = bidDepth + askDepth;
  
  const imbalanceRatio = askDepth > 0 ? bidDepth / askDepth : null;
  
  // Calculate liquidity score (simplified)
  const liquidityScore = totalDepth > 0 ? Math.min(100, Math.log10(totalDepth) * 20) : 0;
  
  return await OrderBookSnapshot.create({
    trading_pair_id: tradingPairId,
    snapshot_time: new Date(),
    sequence_number: sequenceNumber,
    bids: bids,
    asks: asks,
    best_bid: bestBid,
    best_ask: bestAsk,
    spread: spread,
    spread_percent: spreadPercent,
    bid_depth: bidDepth,
    ask_depth: askDepth,
    total_depth: totalDepth,
    imbalance_ratio: imbalanceRatio,
    liquidity_score: liquidityScore
  });
};

OrderBookSnapshot.getLatestSnapshot = async function(tradingPairId) {
  return await OrderBookSnapshot.findOne({
    where: { trading_pair_id: tradingPairId },
    order: [['sequence_number', 'DESC']]
  });
};

OrderBookSnapshot.getSnapshotHistory = async function(tradingPairId, limit = 100, startTime = null, endTime = null) {
  const where = { trading_pair_id: tradingPairId };
  
  if (startTime || endTime) {
    where.snapshot_time = {};
    if (startTime) where.snapshot_time[sequelize.Op.gte] = startTime;
    if (endTime) where.snapshot_time[sequelize.Op.lte] = endTime;
  }
  
  return await OrderBookSnapshot.findAll({
    where,
    order: [['snapshot_time', 'DESC']],
    limit
  });
};

OrderBookSnapshot.getLiquidityMetrics = async function(tradingPairId, timeRange = '1h') {
  const timeRangeMap = {
    '1h': 1,
    '4h': 4,
    '1d': 24,
    '7d': 168
  };
  
  const hoursBack = timeRangeMap[timeRange] || 1;
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const snapshots = await OrderBookSnapshot.findAll({
    where: {
      trading_pair_id: tradingPairId,
      snapshot_time: { [sequelize.Op.gte]: startTime }
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('spread_percent')), 'avg_spread'],
      [sequelize.fn('AVG', sequelize.col('total_depth')), 'avg_depth'],
      [sequelize.fn('AVG', sequelize.col('liquidity_score')), 'avg_liquidity_score'],
      [sequelize.fn('AVG', sequelize.col('imbalance_ratio')), 'avg_imbalance'],
      [sequelize.fn('MIN', sequelize.col('spread_percent')), 'min_spread'],
      [sequelize.fn('MAX', sequelize.col('spread_percent')), 'max_spread']
    ],
    raw: true
  });
  
  return snapshots[0] || {};
};

OrderBookSnapshot.cleanupOldSnapshots = async function(retentionDays = 30) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  return await OrderBookSnapshot.destroy({
    where: {
      snapshot_time: { [sequelize.Op.lt]: cutoffDate }
    }
  });
};

module.exports = OrderBookSnapshot;