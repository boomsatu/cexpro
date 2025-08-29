const orderMatchingEngine = require('../services/orderMatchingEngine');
const orderBookManager = require('../services/orderBookManager');
const marketDataService = require('../services/marketDataService');
const walletService = require('../services/walletService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Market = require('../models/Market');
const Balance = require('../models/Balance');

/**
 * Trading Controller
 * Mengelola semua endpoint trading API termasuk order management,
 * market data, dan wallet operations
 */
class TradingController {
  
  /**
   * Place new order
   */
  async placeOrder(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      
      const {
        symbol,
        side,
        type,
        quantity,
        price,
        stopPrice,
        timeInForce,
        clientOrderId
      } = req.body;
      
      const userId = req.user.id;
      
      // Validate market exists and is active
      const market = await Market.findOne({
        where: { symbol: symbol.toUpperCase(), is_active: true }
      });
      
      if (!market) {
        return res.status(400).json({
          success: false,
          message: 'Market not found or inactive'
        });
      }
      
      // Check user balance for buy orders
      if (side === 'buy') {
        const requiredBalance = type === 'market' ? 
          parseFloat(quantity) * parseFloat(market.last_price) * 1.1 : // 10% buffer for market orders
          parseFloat(quantity) * parseFloat(price);
          
        const balance = await Balance.findOne({
          where: {
            user_id: userId,
            currency: market.quote_currency
          }
        });
        
        if (!balance || parseFloat(balance.available) < requiredBalance) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient balance'
          });
        }
      }
      
      // Check user balance for sell orders
      if (side === 'sell') {
        const balance = await Balance.findOne({
          where: {
            user_id: userId,
            currency: market.base_currency
          }
        });
        
        if (!balance || parseFloat(balance.available) < parseFloat(quantity)) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient balance'
          });
        }
      }
      
      // Prepare order data
      const orderData = {
        user_id: userId,
        market_id: market.id,
        symbol: symbol.toUpperCase(),
        side,
        type,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : null,
        stop_price: stopPrice ? parseFloat(stopPrice) : null,
        time_in_force: timeInForce || 'GTC',
        client_order_id: clientOrderId,
        source: 'api'
      };
      
      // Place order through matching engine
      const result = await orderMatchingEngine.placeOrder(orderData);
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Cancel order
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }
      
      // Cancel order through matching engine
      const result = await orderMatchingEngine.cancelOrder(orderId, userId);
      
      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Cancel all orders
   */
  async cancelAllOrders(req, res) {
    try {
      const userId = req.user.id;
      const { symbol } = req.query;
      
      // Get active orders
      const whereClause = {
        user_id: userId,
        status: { [Op.in]: ['pending', 'open', 'partially_filled'] }
      };
      
      if (symbol) {
        whereClause.symbol = symbol.toUpperCase();
      }
      
      const orders = await Order.findAll({
        where: whereClause,
        attributes: ['id']
      });
      
      const results = [];
      
      // Cancel each order
      for (const order of orders) {
        try {
          const result = await orderMatchingEngine.cancelOrder(order.id, userId);
          results.push(result);
        } catch (error) {
          console.error(`Error cancelling order ${order.id}:`, error);
          results.push({
            orderId: order.id,
            success: false,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Cancelled ${results.filter(r => r.success !== false).length} orders`,
        data: results
      });
      
    } catch (error) {
      console.error('Error cancelling all orders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get user orders
   */
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const {
        symbol,
        status,
        side,
        type,
        limit = 50,
        offset = 0,
        startTime,
        endTime
      } = req.query;
      
      // Build where clause
      const whereClause = { user_id: userId };
      
      if (symbol) {
        whereClause.symbol = symbol.toUpperCase();
      }
      
      if (status) {
        whereClause.status = status;
      }
      
      if (side) {
        whereClause.side = side;
      }
      
      if (type) {
        whereClause.type = type;
      }
      
      if (startTime || endTime) {
        whereClause.created_at = {};
        if (startTime) {
          whereClause.created_at[Op.gte] = new Date(parseInt(startTime));
        }
        if (endTime) {
          whereClause.created_at[Op.lte] = new Date(parseInt(endTime));
        }
      }
      
      // Get orders
      const { count, rows: orders } = await Order.findAndCountAll({
        where: whereClause,
        limit: Math.min(parseInt(limit), 1000),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: Market,
          attributes: ['symbol', 'base_currency', 'quote_currency']
        }]
      });
      
      res.json({
        success: true,
        data: {
          orders,
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
      
    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get order by ID
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      
      const order = await Order.findOne({
        where: {
          id: orderId,
          user_id: userId
        },
        include: [{
          model: Market,
          attributes: ['symbol', 'base_currency', 'quote_currency']
        }]
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      res.json({
        success: true,
        data: order
      });
      
    } catch (error) {
      console.error('Error getting order by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get user trades
   */
  async getUserTrades(req, res) {
    try {
      const userId = req.user.id;
      const {
        symbol,
        limit = 50,
        offset = 0,
        startTime,
        endTime
      } = req.query;
      
      // Build where clause
      const whereClause = {
        [Op.or]: [
          { maker_user_id: userId },
          { taker_user_id: userId }
        ],
        status: 'settled'
      };
      
      if (startTime || endTime) {
        whereClause.created_at = {};
        if (startTime) {
          whereClause.created_at[Op.gte] = new Date(parseInt(startTime));
        }
        if (endTime) {
          whereClause.created_at[Op.lte] = new Date(parseInt(endTime));
        }
      }
      
      // Get trades
      const { count, rows: trades } = await Trade.findAndCountAll({
        where: whereClause,
        limit: Math.min(parseInt(limit), 1000),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: Market,
          attributes: ['symbol', 'base_currency', 'quote_currency'],
          where: symbol ? { symbol: symbol.toUpperCase() } : {}
        }]
      });
      
      // Add user role (maker/taker) to each trade
      const tradesWithRole = trades.map(trade => {
        const tradeData = trade.toJSON();
        tradeData.userRole = trade.maker_user_id === userId ? 'maker' : 'taker';
        tradeData.userFee = trade.maker_user_id === userId ? trade.maker_fee : trade.taker_fee;
        return tradeData;
      });
      
      res.json({
        success: true,
        data: {
          trades: tradesWithRole,
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
      
    } catch (error) {
      console.error('Error getting user trades:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get order book
   */
  async getOrderBook(req, res) {
    try {
      const { symbol } = req.params;
      const { depth = 20 } = req.query;
      
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Symbol is required'
        });
      }
      
      // Validate market exists
      const market = await Market.findOne({
        where: { symbol: symbol.toUpperCase(), is_active: true }
      });
      
      if (!market) {
        return res.status(404).json({
          success: false,
          message: 'Market not found'
        });
      }
      
      // Get order book
      const orderBook = await orderBookManager.getOrderBook(
        symbol.toUpperCase(),
        Math.min(parseInt(depth), 100)
      );
      
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          ...orderBook,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error getting order book:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get ticker
   */
  async getTicker(req, res) {
    try {
      const { symbol } = req.params;
      
      if (symbol) {
        // Get single ticker
        const market = await Market.findOne({
          where: { symbol: symbol.toUpperCase(), is_active: true }
        });
        
        if (!market) {
          return res.status(404).json({
            success: false,
            message: 'Market not found'
          });
        }
        
        const ticker = await marketDataService.getTicker(symbol.toUpperCase());
        
        res.json({
          success: true,
          data: ticker
        });
      } else {
        // Get all tickers
        const tickers = await marketDataService.getAllTickers();
        
        res.json({
          success: true,
          data: tickers
        });
      }
      
    } catch (error) {
      console.error('Error getting ticker:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get candlesticks
   */
  async getCandlesticks(req, res) {
    try {
      const { symbol } = req.params;
      const {
        interval,
        limit = 100,
        startTime,
        endTime
      } = req.query;
      
      if (!symbol || !interval) {
        return res.status(400).json({
          success: false,
          message: 'Symbol and interval are required'
        });
      }
      
      // Validate market exists
      const market = await Market.findOne({
        where: { symbol: symbol.toUpperCase(), is_active: true }
      });
      
      if (!market) {
        return res.status(404).json({
          success: false,
          message: 'Market not found'
        });
      }
      
      // Get candlesticks
      const candlesticks = await marketDataService.getCandlesticks(
        symbol.toUpperCase(),
        interval,
        Math.min(parseInt(limit), 1000),
        startTime ? parseInt(startTime) : null,
        endTime ? parseInt(endTime) : null
      );
      
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          interval,
          candlesticks
        }
      });
      
    } catch (error) {
      console.error('Error getting candlesticks:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get recent trades
   */
  async getRecentTrades(req, res) {
    try {
      const { symbol } = req.params;
      const { limit = 50 } = req.query;
      
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Symbol is required'
        });
      }
      
      // Validate market exists
      const market = await Market.findOne({
        where: { symbol: symbol.toUpperCase(), is_active: true }
      });
      
      if (!market) {
        return res.status(404).json({
          success: false,
          message: 'Market not found'
        });
      }
      
      // Get recent trades
      const trades = await Trade.findAll({
        where: {
          market_id: market.id,
          status: 'settled'
        },
        limit: Math.min(parseInt(limit), 1000),
        order: [['created_at', 'DESC']],
        attributes: [
          'id',
          'price',
          'quantity',
          'side',
          'created_at'
        ]
      });
      
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          trades
        }
      });
      
    } catch (error) {
      console.error('Error getting recent trades:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get market statistics
   */
  async getMarketStats(req, res) {
    try {
      const stats = await marketDataService.getMarketStats();
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Error getting market stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get user balances
   */
  async getUserBalances(req, res) {
    try {
      const userId = req.user.id;
      const { currency } = req.query;
      
      const whereClause = { user_id: userId };
      
      if (currency) {
        whereClause.currency = currency.toLowerCase();
      }
      
      const balances = await Balance.findAll({
        where: whereClause,
        order: [['currency', 'ASC']]
      });
      
      res.json({
        success: true,
        data: balances
      });
      
    } catch (error) {
      console.error('Error getting user balances:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Get user wallets
   */
  async getUserWallets(req, res) {
    try {
      const userId = req.user.id;
      const { currency, walletType } = req.query;
      
      const wallets = await walletService.getUserWallets(userId, currency, walletType);
      
      res.json({
        success: true,
        data: wallets
      });
      
    } catch (error) {
      console.error('Error getting user wallets:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Create new wallet
   */
  async createWallet(req, res) {
    try {
      const userId = req.user.id;
      const { currency, walletType = 'hot' } = req.body;
      
      if (!currency) {
        return res.status(400).json({
          success: false,
          message: 'Currency is required'
        });
      }
      
      const wallet = await walletService.createWallet(userId, currency, walletType);
      
      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: wallet
      });
      
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Generate new address
   */
  async generateNewAddress(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;
      
      // Verify wallet ownership
      const wallet = await walletService.getUserWallets(userId);
      const userWallet = wallet.find(w => w.id === parseInt(walletId));
      
      if (!userWallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      const newWallet = await walletService.generateNewAddress(walletId);
      
      res.status(201).json({
        success: true,
        message: 'New address generated successfully',
        data: {
          address: newWallet.address,
          walletId: newWallet.id
        }
      });
      
    } catch (error) {
      console.error('Error generating new address:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new TradingController();