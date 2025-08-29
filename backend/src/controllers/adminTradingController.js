const { Market, Transaction, Order, User, Trade } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Get all trading pairs with statistics
 */
const getTradingPairs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { symbol: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Status filter
    if (status) {
      whereClause.is_active = status === 'active';
    }

    const { count, rows: tradingPairs } = await Market.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    // Get statistics for each trading pair
    const tradingPairsWithStats = await Promise.all(
      tradingPairs.map(async (pair) => {
        const pairObj = pair.toJSON();
        
        // Get 24h volume and transaction count
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const stats = await Trade.findAll({
          where: {
            trading_pair_id: pair.id,
            trade_time: { [Op.gte]: last24h },
            settlement_status: 'settled'
          },
          attributes: [
            [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'transactions_24h'],
            [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume_24h'],
            [Trade.sequelize.fn('AVG', Trade.sequelize.col('price')), 'avg_price_24h']
          ],
          raw: true
        });

        // Get latest price
        const latestTrade = await Trade.findOne({
          where: {
            trading_pair_id: pair.id,
            settlement_status: 'settled'
          },
          order: [['trade_time', 'DESC']],
          attributes: ['price', 'trade_time']
        });

        pairObj.stats = {
          transactions_24h: parseInt(stats[0]?.transactions_24h) || 0,
          volume_24h: parseFloat(stats[0]?.volume_24h) || 0,
          avg_price_24h: parseFloat(stats[0]?.avg_price_24h) || 0,
          latest_price: latestTrade?.price || 0,
          last_trade_at: latestTrade?.trade_time || null
        };

        return pairObj;
      })
    );

    res.json({
      success: true,
      data: {
        trading_pairs: tradingPairsWithStats,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get trading pairs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trading pairs',
      code: 'GET_TRADING_PAIRS_FAILED'
    });
  }
};

/**
 * Get trading pair details by ID
 */
const getTradingPairById = async (req, res) => {
  try {
    const { id } = req.params;

    const tradingPair = await Market.findByPk(id);
    if (!tradingPair) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found',
        code: 'TRADING_PAIR_NOT_FOUND'
      });
    }

    // Get detailed statistics
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get statistics for different periods
    const [stats24h, stats7d, stats30d, totalStats] = await Promise.all([
      Trade.findAll({
        where: {
          trading_pair_id: id,
          trade_time: { [Op.gte]: last24h },
          settlement_status: 'settled'
        },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume'],
          [Trade.sequelize.fn('MIN', Trade.sequelize.col('price')), 'min_price'],
          [Trade.sequelize.fn('MAX', Trade.sequelize.col('price')), 'max_price'],
          [Trade.sequelize.fn('AVG', Trade.sequelize.col('price')), 'avg_price']
        ],
        raw: true
      }),
      Trade.findAll({
        where: {
          trading_pair_id: id,
          trade_time: { [Op.gte]: last7d },
          settlement_status: 'settled'
        },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume']
        ],
        raw: true
      }),
      Trade.findAll({
        where: {
          trading_pair_id: id,
          trade_time: { [Op.gte]: last30d },
          settlement_status: 'settled'
        },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume']
        ],
        raw: true
      }),
      Trade.findAll({
        where: {
          trading_pair_id: id,
          settlement_status: 'settled'
        },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume']
        ],
        raw: true
      })
    ]);

    // Get recent trades
    const recentTrades = await Trade.findAll({
      where: {
        trading_pair_id: id,
        settlement_status: 'settled'
      },
      include: [
        {
          model: User,
          as: 'buyerUser',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'sellerUser',
          attributes: ['id', 'username']
        }
      ],
      limit: 20,
      order: [['trade_time', 'DESC']],
      attributes: ['id', 'price', 'quantity', 'buyer_fee', 'seller_fee', 'trade_time', 'buyer_id', 'seller_id']
    });

    // Get price history for chart (last 24h, hourly data)
    const priceHistory = await Trade.findAll({
      where: {
        trading_pair_id: id,
        trade_time: { [Op.gte]: last24h },
        settlement_status: 'settled'
      },
      attributes: [
        [Trade.sequelize.fn('DATE_TRUNC', 'hour', Trade.sequelize.col('trade_time')), 'hour'],
        [Trade.sequelize.fn('AVG', Trade.sequelize.col('price')), 'avg_price'],
        [Trade.sequelize.fn('MIN', Trade.sequelize.col('price')), 'min_price'],
        [Trade.sequelize.fn('MAX', Trade.sequelize.col('price')), 'max_price'],
        [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume']
      ],
      group: [Trade.sequelize.fn('DATE_TRUNC', 'hour', Trade.sequelize.col('trade_time'))],
      order: [[Trade.sequelize.fn('DATE_TRUNC', 'hour', Trade.sequelize.col('trade_time')), 'ASC']],
      raw: true
    });

    const tradingPairObj = tradingPair.toJSON();
    tradingPairObj.statistics = {
      last_24h: {
        transactions: parseInt(stats24h[0]?.transactions) || 0,
        volume: parseFloat(stats24h[0]?.volume) || 0,
        min_price: parseFloat(stats24h[0]?.min_price) || 0,
        max_price: parseFloat(stats24h[0]?.max_price) || 0,
        avg_price: parseFloat(stats24h[0]?.avg_price) || 0
      },
      last_7d: {
        transactions: parseInt(stats7d[0]?.transactions) || 0,
        volume: parseFloat(stats7d[0]?.volume) || 0
      },
      last_30d: {
        transactions: parseInt(stats30d[0]?.transactions) || 0,
        volume: parseFloat(stats30d[0]?.volume) || 0
      },
      total: {
        transactions: parseInt(totalStats[0]?.transactions) || 0,
        volume: parseFloat(totalStats[0]?.volume) || 0
      }
    };

    tradingPairObj.recent_trades = recentTrades;
    tradingPairObj.price_history = priceHistory;

    res.json({
      success: true,
      data: tradingPairObj
    });
  } catch (error) {
    logger.error('Get trading pair by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trading pair details',
      code: 'GET_TRADING_PAIR_FAILED'
    });
  }
};

/**
 * Create new trading pair
 */
const createTradingPair = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      symbol,
      base_currency_id,
      quote_currency_id,
      min_order_size,
      max_order_size,
      price_precision,
      quantity_precision,
      maker_fee,
      taker_fee,
      is_active = true
    } = req.body;

    // Check if trading pair already exists
    const existingPair = await Market.findOne({
      where: { symbol }
    });

    if (existingPair) {
      return res.status(400).json({
        success: false,
        error: 'Trading pair already exists',
        code: 'TRADING_PAIR_EXISTS'
      });
    }

    const tradingPair = await Market.create({
      symbol,
      base_currency_id,
      quote_currency_id,
      min_order_size,
      max_order_size,
      price_precision,
      quantity_precision,
      maker_fee,
      taker_fee,
      is_active
    });

    // Log the action
    logger.info(`Trading pair created by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      trading_pair_id: tradingPair.id,
      symbol,
      base_currency_id,
      quote_currency_id
    });

    res.status(201).json({
      success: true,
      message: 'Trading pair created successfully',
      data: tradingPair
    });
  } catch (error) {
    logger.error('Create trading pair error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create trading pair',
      code: 'CREATE_TRADING_PAIR_FAILED'
    });
  }
};

/**
 * Update trading pair
 */
const updateTradingPair = async (req, res) => {
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
    const updateData = req.body;

    const tradingPair = await Market.findByPk(id);
    if (!tradingPair) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found',
        code: 'TRADING_PAIR_NOT_FOUND'
      });
    }

    // If updating symbol, check for duplicates
    if (updateData.symbol && updateData.symbol !== tradingPair.symbol) {
      const existingPair = await Market.findOne({
        where: {
          symbol: updateData.symbol,
          id: { [Op.ne]: id }
        }
      });

      if (existingPair) {
        return res.status(400).json({
          success: false,
          error: 'Trading pair symbol already exists',
          code: 'SYMBOL_EXISTS'
        });
      }
    }

    const oldData = { ...tradingPair.toJSON() };
    await tradingPair.update(updateData);

    // Log the action
    logger.info(`Trading pair updated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      trading_pair_id: id,
      old_data: oldData,
      new_data: updateData
    });

    res.json({
      success: true,
      message: 'Trading pair updated successfully',
      data: tradingPair
    });
  } catch (error) {
    logger.error('Update trading pair error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trading pair',
      code: 'UPDATE_TRADING_PAIR_FAILED'
    });
  }
};

/**
 * Toggle trading pair status
 */
const toggleTradingPairStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    const tradingPair = await Market.findByPk(id);
    if (!tradingPair) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found',
        code: 'TRADING_PAIR_NOT_FOUND'
      });
    }

    const oldStatus = tradingPair.is_active;
    await tradingPair.update({ is_active });

    // Log the action
    logger.info(`Trading pair status toggled by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      trading_pair_id: id,
      symbol: tradingPair.symbol,
      old_status: oldStatus,
      new_status: is_active,
      reason: reason || 'No reason provided'
    });

    res.json({
      success: true,
      message: `Trading pair ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        trading_pair_id: id,
        symbol: tradingPair.symbol,
        is_active,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Toggle trading pair status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle trading pair status',
      code: 'TOGGLE_STATUS_FAILED'
    });
  }
};

/**
 * Delete trading pair
 */
const deleteTradingPair = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm_deletion } = req.body;

    if (!confirm_deletion) {
      return res.status(400).json({
        success: false,
        error: 'Deletion confirmation required',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    const tradingPair = await Market.findByPk(id);
    if (!tradingPair) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found',
        code: 'TRADING_PAIR_NOT_FOUND'
      });
    }

    // Check if there are any transactions for this trading pair
    const transactionCount = await Transaction.count({
      where: { trading_pair_id: id }
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete trading pair with existing transactions',
        code: 'HAS_TRANSACTIONS',
        details: {
          transaction_count: transactionCount
        }
      });
    }

    const deletedPair = { ...tradingPair.toJSON() };
    await tradingPair.destroy();

    // Log the action
    logger.info(`Trading pair deleted by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      deleted_pair: deletedPair
    });

    res.json({
      success: true,
      message: 'Trading pair deleted successfully',
      data: {
        deleted_pair: deletedPair,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Delete trading pair error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete trading pair',
      code: 'DELETE_TRADING_PAIR_FAILED'
    });
  }
};

/**
 * Get trading statistics overview
 */
const getTradingStats = async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get overall trading statistics
    const [totalStats, periodStats, topPairs] = await Promise.all([
      // Total statistics
      Trade.findAll({
        where: { settlement_status: 'settled' },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'total_transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'total_volume'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.literal('buyer_fee + seller_fee')), 'total_fees']
        ],
        raw: true
      }),
      // Period statistics
      Trade.findAll({
        where: {
          settlement_status: 'settled',
          trade_time: { [Op.gte]: startDate }
        },
        attributes: [
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('id')), 'period_transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'period_volume'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.literal('buyer_fee + seller_fee')), 'period_fees']
        ],
        raw: true
      }),
      // Top trading pairs by volume
      Trade.findAll({
        where: {
          settlement_status: 'settled',
          trade_time: { [Op.gte]: startDate }
        },
        include: [
          {
            model: Market,
            as: 'tradingPair',
            attributes: ['id', 'symbol', 'base_currency_id', 'quote_currency_id']
          }
        ],
        attributes: [
          'trading_pair_id',
          [Trade.sequelize.fn('COUNT', Trade.sequelize.col('Trade.id')), 'transactions'],
          [Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'volume']
        ],
        group: ['trading_pair_id', 'tradingPair.id'],
        order: [[Trade.sequelize.fn('SUM', Trade.sequelize.col('quantity')), 'DESC']],
        limit: 10,
        raw: false
      })
    ]);

    const stats = {
      period,
      total: {
        transactions: parseInt(totalStats[0]?.total_transactions) || 0,
        volume: parseFloat(totalStats[0]?.total_volume) || 0,
        fees: parseFloat(totalStats[0]?.total_fees) || 0
      },
      period_stats: {
        transactions: parseInt(periodStats[0]?.period_transactions) || 0,
        volume: parseFloat(periodStats[0]?.period_volume) || 0,
        fees: parseFloat(periodStats[0]?.period_fees) || 0
      },
      top_trading_pairs: topPairs.map(item => ({
        trading_pair: item.tradingPair || null,
        transactions: parseInt(item.dataValues?.transactions) || 0,
        volume: parseFloat(item.dataValues?.volume) || 0
      })).filter(item => item.trading_pair !== null),
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get trading stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trading statistics',
      code: 'GET_TRADING_STATS_FAILED'
    });
  }
};

/**
 * Get all trades with pagination and filters
 */
const getTrades = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      user_id = '',
      symbol = '',
      status = '',
      date_from = '',
      date_to = '',
      sort_by = 'trade_time',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    const includeOptions = [];

    // User filter
    if (user_id) {
      whereClause[Op.or] = [
        { buyer_id: user_id },
        { seller_id: user_id }
      ];
    }

    // Status filter
    if (status) {
      whereClause.settlement_status = status;
    }

    // Date range filter
    if (date_from || date_to) {
      whereClause.trade_time = {};
      if (date_from) {
        whereClause.trade_time[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.trade_time[Op.lte] = new Date(date_to);
      }
    }

    // Include trading pair info
    includeOptions.push({
      model: Market,
      as: 'tradingPair',
      attributes: ['id', 'symbol', 'base_currency_id', 'quote_currency_id']
    });

    // Include buyer and seller info
    includeOptions.push({
      model: User,
      as: 'buyerUser',
      attributes: ['id', 'username', 'email']
    });

    includeOptions.push({
      model: User,
      as: 'sellerUser',
      attributes: ['id', 'username', 'email']
    });

    // Symbol filter (through trading pair)
    if (symbol) {
      includeOptions[0].where = {
        symbol: { [Op.iLike]: `%${symbol}%` }
      };
    }

    const { count, rows: trades } = await Trade.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true
    });

    // Calculate summary statistics
    const totalVolume = await Trade.sum('quantity', {
      where: whereClause,
      include: symbol ? [{
        model: Market,
        as: 'tradingPair',
        where: { symbol: { [Op.iLike]: `%${symbol}%` } }
      }] : []
    });

    const totalFees = await Trade.sum('buyer_fee', {
      where: whereClause,
      include: symbol ? [{
        model: Market,
        as: 'tradingPair',
        where: { symbol: { [Op.iLike]: `%${symbol}%` } }
      }] : []
    }) + await Trade.sum('seller_fee', {
      where: whereClause,
      include: symbol ? [{
        model: Market,
        as: 'tradingPair',
        where: { symbol: { [Op.iLike]: `%${symbol}%` } }
      }] : []
    });

    res.json({
      success: true,
      data: {
        trades,
        summary: {
          total_trades: count,
          total_volume: parseFloat(totalVolume) || 0,
          total_fees: parseFloat(totalFees) || 0
        },
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get trades error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trades',
      code: 'GET_TRADES_FAILED'
    });
  }
};

module.exports = {
  getTradingPairs,
  getTradingPairById,
  createTradingPair,
  updateTradingPair,
  toggleTradingPairStatus,
  deleteTradingPair,
  getTradingStats,
  getTrades
};