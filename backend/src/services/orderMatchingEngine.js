const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Market = require('../models/Market');
const Balance = require('../models/Balance');
const { client: redis } = require('../config/redis');
const EventEmitter = require('events');

/**
 * Order Matching Engine
 * Implementasi algoritma matching dengan price-time priority
 * Mendukung berbagai order types: market, limit, stop, stop-limit
 */
class OrderMatchingEngine extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = new Map(); // Track processing status per market
    this.orderQueues = new Map(); // In-memory order queues per market
    this.lastPrices = new Map(); // Last trade prices per market
    
    // Initialize event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for new orders
    this.on('newOrder', this.handleNewOrder.bind(this));
    
    // Listen for order cancellations
    this.on('cancelOrder', this.handleCancelOrder.bind(this));
    
    // Listen for market data updates
    this.on('priceUpdate', this.handlePriceUpdate.bind(this));
  }
  
  /**
   * Process a new order
   */
  async processOrder(orderData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate market
      const market = await Market.findOne({
        where: { 
          symbol: orderData.market_symbol,
          is_active: true
        }
      });
      
      if (!market) {
        throw new Error('Market not found or inactive');
      }
      
      // Validate and lock user balance
      await this.validateAndLockBalance(orderData, market, transaction);
      
      // Create order
      const order = await Order.create({
        ...orderData,
        market_id: market.id,
        status: 'open'
      }, { transaction });
      
      await transaction.commit();
      
      // Emit new order event for matching
      this.emit('newOrder', { order, market });
      
      return order;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Handle new order for matching
   */
  async handleNewOrder({ order, market }) {
    const marketSymbol = market.symbol;
    
    // Prevent concurrent processing for the same market
    if (this.isProcessing.get(marketSymbol)) {
      // Queue the order for later processing
      await this.queueOrder(order, market);
      return;
    }
    
    this.isProcessing.set(marketSymbol, true);
    
    try {
      await this.matchOrder(order, market);
    } catch (error) {
      console.error(`Error matching order ${order.id}:`, error);
      // Update order status to failed
      await order.update({ 
        status: 'failed',
        notes: `Matching failed: ${error.message}`
      });
    } finally {
      this.isProcessing.set(marketSymbol, false);
      
      // Process queued orders
      await this.processQueuedOrders(marketSymbol);
    }
  }
  
  /**
   * Main order matching logic
   */
  async matchOrder(order, market) {
    // Handle different order types
    switch (order.type) {
      case 'market':
        await this.matchMarketOrder(order, market);
        break;
      case 'limit':
        await this.matchLimitOrder(order, market);
        break;
      case 'stop':
        await this.handleStopOrder(order, market);
        break;
      case 'stop_limit':
        await this.handleStopLimitOrder(order, market);
        break;
      default:
        throw new Error(`Unsupported order type: ${order.type}`);
    }
  }
  
  /**
   * Match market order
   */
  async matchMarketOrder(order, market) {
    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    
    // Get opposite orders sorted by price-time priority
    const oppositeOrders = await this.getOppositeOrders(market.id, oppositeSide, order.side);
    
    let remainingQuantity = parseFloat(order.quantity_remaining);
    const trades = [];
    
    for (const oppositeOrder of oppositeOrders) {
      if (remainingQuantity <= 0) break;
      
      const tradeQuantity = Math.min(
        remainingQuantity,
        parseFloat(oppositeOrder.quantity_remaining)
      );
      
      const tradePrice = parseFloat(oppositeOrder.price);
      
      // Execute trade
      const trade = await this.executeTrade(
        order,
        oppositeOrder,
        tradePrice,
        tradeQuantity,
        market
      );
      
      trades.push(trade);
      remainingQuantity -= tradeQuantity;
      
      // Update last price
      this.lastPrices.set(market.symbol, tradePrice);
      await this.updateMarketPrice(market, tradePrice);
    }
    
    // Update order status
    if (remainingQuantity <= 0) {
      await order.update({ 
        status: 'filled',
        quantity_remaining: 0,
        filled_at: new Date()
      });
    } else {
      // Market order couldn't be fully filled
      await order.update({ 
        status: 'partially_filled',
        quantity_remaining: remainingQuantity
      });
      
      // For market orders, cancel remaining quantity
      await this.cancelRemainingQuantity(order, 'insufficient_liquidity');
    }
    
    // Emit trade events
    for (const trade of trades) {
      this.emit('trade', { trade, market });
    }
  }
  
  /**
   * Match limit order
   */
  async matchLimitOrder(order, market) {
    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    const orderPrice = parseFloat(order.price);
    
    // Get matching opposite orders
    const oppositeOrders = await this.getMatchingOrders(
      market.id, 
      oppositeSide, 
      orderPrice, 
      order.side
    );
    
    let remainingQuantity = parseFloat(order.quantity_remaining);
    const trades = [];
    
    for (const oppositeOrder of oppositeOrders) {
      if (remainingQuantity <= 0) break;
      
      const tradeQuantity = Math.min(
        remainingQuantity,
        parseFloat(oppositeOrder.quantity_remaining)
      );
      
      const tradePrice = parseFloat(oppositeOrder.price);
      
      // Execute trade
      const trade = await this.executeTrade(
        order,
        oppositeOrder,
        tradePrice,
        tradeQuantity,
        market
      );
      
      trades.push(trade);
      remainingQuantity -= tradeQuantity;
      
      // Update last price
      this.lastPrices.set(market.symbol, tradePrice);
      await this.updateMarketPrice(market, tradePrice);
    }
    
    // Update order status
    if (remainingQuantity <= 0) {
      await order.update({ 
        status: 'filled',
        quantity_remaining: 0,
        filled_at: new Date()
      });
    } else if (remainingQuantity < parseFloat(order.quantity)) {
      await order.update({ 
        status: 'partially_filled',
        quantity_remaining: remainingQuantity
      });
    }
    // If no matches, order remains 'open'
    
    // Emit trade events
    for (const trade of trades) {
      this.emit('trade', { trade, market });
    }
  }
  
  /**
   * Handle stop order
   */
  async handleStopOrder(order, market) {
    const currentPrice = this.lastPrices.get(market.symbol) || parseFloat(market.last_price);
    const stopPrice = parseFloat(order.stop_price);
    
    let shouldTrigger = false;
    
    if (order.side === 'buy' && currentPrice >= stopPrice) {
      shouldTrigger = true;
    } else if (order.side === 'sell' && currentPrice <= stopPrice) {
      shouldTrigger = true;
    }
    
    if (shouldTrigger) {
      // Convert to market order
      await order.update({ 
        type: 'market',
        status: 'open',
        notes: `Stop order triggered at price ${currentPrice}`
      });
      
      // Process as market order
      await this.matchMarketOrder(order, market);
    }
    // If not triggered, order remains in 'pending' status
  }
  
  /**
   * Handle stop-limit order
   */
  async handleStopLimitOrder(order, market) {
    const currentPrice = this.lastPrices.get(market.symbol) || parseFloat(market.last_price);
    const stopPrice = parseFloat(order.stop_price);
    
    let shouldTrigger = false;
    
    if (order.side === 'buy' && currentPrice >= stopPrice) {
      shouldTrigger = true;
    } else if (order.side === 'sell' && currentPrice <= stopPrice) {
      shouldTrigger = true;
    }
    
    if (shouldTrigger) {
      // Convert to limit order
      await order.update({ 
        type: 'limit',
        status: 'open',
        notes: `Stop-limit order triggered at price ${currentPrice}`
      });
      
      // Process as limit order
      await this.matchLimitOrder(order, market);
    }
    // If not triggered, order remains in 'pending' status
  }
  
  /**
   * Execute a trade between two orders
   */
  async executeTrade(takerOrder, makerOrder, price, quantity, market) {
    const transaction = await sequelize.transaction();
    
    try {
      // Calculate trade value and fees
      const tradeValue = parseFloat(price) * parseFloat(quantity);
      const makerFee = tradeValue * parseFloat(market.maker_fee);
      const takerFee = tradeValue * parseFloat(market.taker_fee);
      
      // Create trade record
      const trade = await Trade.create({
        market_id: market.id,
        maker_user_id: makerOrder.user_id,
        taker_user_id: takerOrder.user_id,
        maker_order_id: makerOrder.id,
        taker_order_id: takerOrder.id,
        side: takerOrder.side,
        price,
        quantity,
        value: tradeValue,
        maker_fee: makerFee,
        taker_fee: takerFee,
        trade_type: 'spot',
        status: 'settled'
      }, { transaction });
      
      // Update order quantities
      const makerRemaining = parseFloat(makerOrder.quantity_remaining) - parseFloat(quantity);
      const takerRemaining = parseFloat(takerOrder.quantity_remaining) - parseFloat(quantity);
      
      await makerOrder.update({
        quantity_filled: parseFloat(makerOrder.quantity_filled) + parseFloat(quantity),
        quantity_remaining: makerRemaining,
        status: makerRemaining <= 0 ? 'filled' : 'partially_filled',
        filled_at: makerRemaining <= 0 ? new Date() : makerOrder.filled_at
      }, { transaction });
      
      await takerOrder.update({
        quantity_filled: parseFloat(takerOrder.quantity_filled) + parseFloat(quantity),
        quantity_remaining: takerRemaining,
        average_price: this.calculateAveragePrice(takerOrder, price, quantity)
      }, { transaction });
      
      // Update user balances
      await this.updateBalancesAfterTrade(
        takerOrder, 
        makerOrder, 
        trade, 
        market, 
        transaction
      );
      
      await transaction.commit();
      
      return trade;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Update user balances after trade execution
   */
  async updateBalancesAfterTrade(takerOrder, makerOrder, trade, market, transaction) {
    const [baseCurrency, quoteCurrency] = market.symbol.split('/');
    const tradeQuantity = parseFloat(trade.quantity);
    const tradeValue = parseFloat(trade.value);
    const makerFee = parseFloat(trade.maker_fee);
    const takerFee = parseFloat(trade.taker_fee);
    
    if (takerOrder.side === 'buy') {
      // Taker is buying (base currency), Maker is selling
      
      // Taker: Add base currency, deduct quote currency (already locked)
      const takerBaseBalance = await Balance.getUserBalance(takerOrder.user_id, baseCurrency);
      const takerQuoteBalance = await Balance.getUserBalance(takerOrder.user_id, quoteCurrency);
      
      await takerBaseBalance.addBalance(tradeQuantity, 'available');
      await takerQuoteBalance.unlockBalance(tradeValue + takerFee);
      
      // Maker: Deduct base currency (already locked), add quote currency
      const makerBaseBalance = await Balance.getUserBalance(makerOrder.user_id, baseCurrency);
      const makerQuoteBalance = await Balance.getUserBalance(makerOrder.user_id, quoteCurrency);
      
      await makerBaseBalance.unlockBalance(tradeQuantity);
      await makerQuoteBalance.addBalance(tradeValue - makerFee, 'available');
      
    } else {
      // Taker is selling (base currency), Maker is buying
      
      // Taker: Deduct base currency (already locked), add quote currency
      const takerBaseBalance = await Balance.getUserBalance(takerOrder.user_id, baseCurrency);
      const takerQuoteBalance = await Balance.getUserBalance(takerOrder.user_id, quoteCurrency);
      
      await takerBaseBalance.unlockBalance(tradeQuantity);
      await takerQuoteBalance.addBalance(tradeValue - takerFee, 'available');
      
      // Maker: Add base currency, deduct quote currency (already locked)
      const makerBaseBalance = await Balance.getUserBalance(makerOrder.user_id, baseCurrency);
      const makerQuoteBalance = await Balance.getUserBalance(makerOrder.user_id, quoteCurrency);
      
      await makerBaseBalance.addBalance(tradeQuantity, 'available');
      await makerQuoteBalance.unlockBalance(tradeValue + makerFee);
    }
  }
  
  /**
   * Get opposite orders for market order matching
   */
  async getOppositeOrders(marketId, side, originalSide) {
    const orderBy = side === 'sell' 
      ? [['price', 'ASC'], ['created_at', 'ASC']] // Best ask first
      : [['price', 'DESC'], ['created_at', 'ASC']]; // Best bid first
    
    return await Order.findAll({
      where: {
        market_id: marketId,
        side,
        status: 'open',
        quantity_remaining: { [Op.gt]: 0 }
      },
      order: orderBy,
      limit: 100 // Limit for performance
    });
  }
  
  /**
   * Get matching orders for limit order
   */
  async getMatchingOrders(marketId, side, price, originalSide) {
    let priceCondition;
    
    if (originalSide === 'buy') {
      // Buy order matches with sell orders at or below the buy price
      priceCondition = { [Op.lte]: price };
    } else {
      // Sell order matches with buy orders at or above the sell price
      priceCondition = { [Op.gte]: price };
    }
    
    const orderBy = side === 'sell' 
      ? [['price', 'ASC'], ['created_at', 'ASC']] // Best ask first
      : [['price', 'DESC'], ['created_at', 'ASC']]; // Best bid first
    
    return await Order.findAll({
      where: {
        market_id: marketId,
        side,
        status: 'open',
        price: priceCondition,
        quantity_remaining: { [Op.gt]: 0 }
      },
      order: orderBy,
      limit: 100
    });
  }
  
  /**
   * Validate and lock user balance for order
   */
  async validateAndLockBalance(orderData, market, transaction) {
    const [baseCurrency, quoteCurrency] = market.symbol.split('/');
    const quantity = parseFloat(orderData.quantity);
    const price = parseFloat(orderData.price || market.last_price);
    
    if (orderData.side === 'buy') {
      // For buy orders, lock quote currency
      const requiredAmount = quantity * price;
      const quoteBalance = await Balance.getUserBalance(orderData.user_id, quoteCurrency);
      
      if (!quoteBalance || !quoteBalance.hasAvailableBalance(requiredAmount)) {
        throw new Error(`Insufficient ${quoteCurrency} balance`);
      }
      
      await quoteBalance.lockBalance(requiredAmount, `Order ${orderData.client_order_id || 'N/A'}`);
      
    } else {
      // For sell orders, lock base currency
      const baseBalance = await Balance.getUserBalance(orderData.user_id, baseCurrency);
      
      if (!baseBalance || !baseBalance.hasAvailableBalance(quantity)) {
        throw new Error(`Insufficient ${baseCurrency} balance`);
      }
      
      await baseBalance.lockBalance(quantity, `Order ${orderData.client_order_id || 'N/A'}`);
    }
  }
  
  /**
   * Calculate average price for partially filled orders
   */
  calculateAveragePrice(order, newPrice, newQuantity) {
    const currentFilled = parseFloat(order.quantity_filled);
    const currentAvgPrice = parseFloat(order.average_price || 0);
    const newPriceFloat = parseFloat(newPrice);
    const newQuantityFloat = parseFloat(newQuantity);
    
    if (currentFilled === 0) {
      return newPriceFloat;
    }
    
    const totalValue = (currentFilled * currentAvgPrice) + (newQuantityFloat * newPriceFloat);
    const totalQuantity = currentFilled + newQuantityFloat;
    
    return totalValue / totalQuantity;
  }
  
  /**
   * Update market last price and statistics
   */
  async updateMarketPrice(market, newPrice) {
    const priceChange = parseFloat(newPrice) - parseFloat(market.last_price);
    const priceChangePercent = (priceChange / parseFloat(market.last_price)) * 100;
    
    await market.update({
      last_price: newPrice,
      price_change_24h: priceChange,
      price_change_percent_24h: priceChangePercent,
      updated_at: new Date()
    });
    
    // Update Redis cache with error handling
    try {
      await redis.set(`market:${market.symbol}:price`, newPrice, { EX: 60 });
    } catch (redisError) {
      console.error(`Redis cache error for market price ${market.symbol}:`, redisError);
      // Continue without caching to prevent unhandled rejection
    }
  }
  
  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId, reason = 'user_cancelled') {
    const transaction = await sequelize.transaction();
    
    try {
      const order = await Order.findOne({
        where: {
          id: orderId,
          user_id: userId,
          status: ['open', 'partially_filled']
        }
      });
      
      if (!order) {
        throw new Error('Order not found or cannot be cancelled');
      }
      
      // Unlock remaining balance
      await this.unlockOrderBalance(order, transaction);
      
      // Update order status
      await order.update({
        status: 'cancelled',
        cancelled_at: new Date(),
        notes: reason
      }, { transaction });
      
      await transaction.commit();
      
      // Emit cancel event
      this.emit('orderCancelled', { order, reason });
      
      return order;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Unlock balance when cancelling order
   */
  async unlockOrderBalance(order, transaction) {
    const market = await Market.findByPk(order.market_id);
    const [baseCurrency, quoteCurrency] = market.symbol.split('/');
    const remainingQuantity = parseFloat(order.quantity_remaining);
    
    if (order.side === 'buy') {
      // Unlock quote currency
      const requiredAmount = remainingQuantity * parseFloat(order.price);
      const quoteBalance = await Balance.getUserBalance(order.user_id, quoteCurrency);
      await quoteBalance.unlockBalance(requiredAmount);
    } else {
      // Unlock base currency
      const baseBalance = await Balance.getUserBalance(order.user_id, baseCurrency);
      await baseBalance.unlockBalance(remainingQuantity);
    }
  }
  
  /**
   * Handle price updates for stop orders
   */
  async handlePriceUpdate({ market, price }) {
    this.lastPrices.set(market.symbol, price);
    
    // Check for stop orders that should be triggered
    const stopOrders = await Order.findAll({
      where: {
        market_id: market.id,
        type: ['stop', 'stop_limit'],
        status: 'pending'
      }
    });
    
    for (const order of stopOrders) {
      const stopPrice = parseFloat(order.stop_price);
      let shouldTrigger = false;
      
      if (order.side === 'buy' && price >= stopPrice) {
        shouldTrigger = true;
      } else if (order.side === 'sell' && price <= stopPrice) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        this.emit('newOrder', { order, market });
      }
    }
  }
  
  /**
   * Queue order for later processing
   */
  async queueOrder(order, market) {
    const marketSymbol = market.symbol;
    
    if (!this.orderQueues.has(marketSymbol)) {
      this.orderQueues.set(marketSymbol, []);
    }
    
    this.orderQueues.get(marketSymbol).push({ order, market });
  }
  
  /**
   * Process queued orders
   */
  async processQueuedOrders(marketSymbol) {
    const queue = this.orderQueues.get(marketSymbol);
    
    if (!queue || queue.length === 0) {
      return;
    }
    
    // Process one order from queue
    const { order, market } = queue.shift();
    
    if (queue.length === 0) {
      this.orderQueues.delete(marketSymbol);
    }
    
    // Process the queued order
    this.emit('newOrder', { order, market });
  }
  
  /**
   * Cancel remaining quantity of partially filled order
   */
  async cancelRemainingQuantity(order, reason) {
    await order.update({
      status: 'cancelled',
      cancelled_at: new Date(),
      notes: `Partially filled, remaining cancelled: ${reason}`
    });
    
    // Unlock remaining balance
    const transaction = await sequelize.transaction();
    try {
      await this.unlockOrderBalance(order, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Handle order cancellation
   */
  async handleCancelOrder(orderData) {
    try {
      const { orderId, userId } = orderData;
      
      // Find the order
      const order = await Order.findOne({
        where: {
          id: orderId,
          user_id: userId,
          status: 'open'
        }
      });
      
      if (!order) {
        throw new Error('Order not found or already processed');
      }
      
      // Get market information
      const market = await Market.findByPk(order.market_id);
      if (!market) {
        throw new Error('Market not found');
      }
      
      const [baseCurrency, quoteCurrency] = market.symbol.split('/');
      const remainingQuantity = parseFloat(order.quantity_remaining);
      
      // Unlock the locked balance
      if (order.side === 'buy') {
        // Unlock quote currency for buy orders
        const price = parseFloat(order.price || market.last_price);
        const lockedAmount = remainingQuantity * price;
        const quoteBalance = await Balance.getUserBalance(order.user_id, quoteCurrency);
        await quoteBalance.unlockBalance(lockedAmount);
      } else {
        // Unlock base currency for sell orders
        const baseBalance = await Balance.getUserBalance(order.user_id, baseCurrency);
        await baseBalance.unlockBalance(remainingQuantity);
      }
      
      // Update order status
      await order.update({
        status: 'cancelled',
        cancelled_at: new Date()
      });
      
      // Emit order cancelled event
      this.emit('orderCancelled', {
        orderId: order.id,
        userId: order.user_id,
        marketSymbol: market.symbol,
        side: order.side,
        quantity: remainingQuantity,
        price: order.price
      });
      
      return {
        success: true,
        message: 'Order cancelled successfully',
        order: {
          id: order.id,
          status: order.status,
          cancelled_at: order.cancelled_at
        }
      };
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
  
  /**
   * Cancel order by ID
   */
  async cancelOrder(orderId, userId) {
    return this.handleCancelOrder({ orderId, userId });
  }

  /**
   * Get order book for a market
   */
  async getOrderBook(marketSymbol, depth = 20) {
    const market = await Market.findOne({ where: { symbol: marketSymbol } });
    
    if (!market) {
      throw new Error('Market not found');
    }
    
    const [bids, asks] = await Promise.all([
      // Buy orders (bids) - highest price first
      Order.findAll({
        where: {
          market_id: market.id,
          side: 'buy',
          status: 'open',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['price', 'DESC'], ['created_at', 'ASC']],
        limit: depth,
        attributes: ['price', 'quantity_remaining']
      }),
      
      // Sell orders (asks) - lowest price first
      Order.findAll({
        where: {
          market_id: market.id,
          side: 'sell',
          status: 'open',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['price', 'ASC'], ['created_at', 'ASC']],
        limit: depth,
        attributes: ['price', 'quantity_remaining']
      })
    ]);
    
    return {
      symbol: marketSymbol,
      bids: bids.map(order => [order.price, order.quantity_remaining]),
      asks: asks.map(order => [order.price, order.quantity_remaining]),
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const orderMatchingEngine = new OrderMatchingEngine();

module.exports = orderMatchingEngine;