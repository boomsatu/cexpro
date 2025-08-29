const { client: redis } = require('../config/redis');
const { Op } = require('sequelize');
const Order = require('../models/Order');
const Market = require('../models/Market');
const EventEmitter = require('events');

/**
 * Order Book Management System
 * Mengelola real-time order book dengan Redis caching
 * dan WebSocket broadcasting
 */
class OrderBookManager extends EventEmitter {
  constructor() {
    super();
    this.orderBooks = new Map(); // In-memory cache
    this.subscribers = new Map(); // WebSocket subscribers per market
    this.updateIntervals = new Map(); // Update intervals per market
    
    // Configuration
    this.config = {
      maxDepth: 50,
      updateInterval: 100, // ms
      redisExpiry: 300, // 5 minutes
      aggregationLevels: [0.00000001, 0.0000001, 0.000001, 0.00001, 0.0001, 0.001, 0.01, 0.1, 1]
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for order updates
    this.on('orderUpdate', this.handleOrderUpdate.bind(this));
    
    // Listen for trade executions
    this.on('tradeExecuted', this.handleTradeExecuted.bind(this));
    
    // Listen for order cancellations
    this.on('orderCancelled', this.handleOrderCancelled.bind(this));
  }
  
  /**
   * Initialize order book for a market
   */
  async initializeOrderBook(marketSymbol) {
    try {
      const market = await Market.findOne({ where: { symbol: marketSymbol } });
      
      if (!market) {
        throw new Error(`Market ${marketSymbol} not found`);
      }
      
      // Load order book from database
      const orderBook = await this.loadOrderBookFromDB(market.id);
      
      // Cache in memory
      this.orderBooks.set(marketSymbol, orderBook);
      
      // Cache in Redis
      await this.cacheOrderBookInRedis(marketSymbol, orderBook);
      
      // Start periodic updates
      this.startPeriodicUpdates(marketSymbol);
      
      console.log(`Order book initialized for ${marketSymbol}`);
      
      return orderBook;
      
    } catch (error) {
      console.error(`Error initializing order book for ${marketSymbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Load order book from database
   */
  async loadOrderBookFromDB(marketId) {
    const [bids, asks] = await Promise.all([
      // Buy orders (bids) - highest price first
      Order.findAll({
        where: {
          market_id: marketId,
          side: 'buy',
          status: 'open',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['price', 'DESC'], ['created_at', 'ASC']],
        limit: this.config.maxDepth,
        attributes: ['id', 'price', 'quantity_remaining', 'created_at']
      }),
      
      // Sell orders (asks) - lowest price first
      Order.findAll({
        where: {
          market_id: marketId,
          side: 'sell',
          status: 'open',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['price', 'ASC'], ['created_at', 'ASC']],
        limit: this.config.maxDepth,
        attributes: ['id', 'price', 'quantity_remaining', 'created_at']
      })
    ]);
    
    return {
      bids: this.processOrders(bids),
      asks: this.processOrders(asks),
      timestamp: new Date().toISOString(),
      sequence: Date.now()
    };
  }
  
  /**
   * Process orders into order book format
   */
  processOrders(orders) {
    const priceMap = new Map();
    
    // Aggregate orders by price level
    for (const order of orders) {
      const price = parseFloat(order.price);
      const quantity = parseFloat(order.quantity_remaining);
      
      if (priceMap.has(price)) {
        priceMap.set(price, priceMap.get(price) + quantity);
      } else {
        priceMap.set(price, quantity);
      }
    }
    
    // Convert to array format [price, quantity]
    return Array.from(priceMap.entries()).map(([price, quantity]) => [price, quantity]);
  }
  
  /**
   * Get order book for a market
   */
  async getOrderBook(marketSymbol, depth = 20, aggregation = null) {
    try {
      // Try to get from memory cache first
      let orderBook = this.orderBooks.get(marketSymbol);
      
      if (!orderBook) {
        // Try to get from Redis cache
        orderBook = await this.getOrderBookFromRedis(marketSymbol);
        
        if (!orderBook) {
          // Initialize from database
          orderBook = await this.initializeOrderBook(marketSymbol);
        } else {
          // Cache in memory
          this.orderBooks.set(marketSymbol, orderBook);
        }
      }
      
      // Apply depth limit
      const limitedOrderBook = {
        ...orderBook,
        bids: orderBook.bids.slice(0, depth),
        asks: orderBook.asks.slice(0, depth)
      };
      
      // Apply price aggregation if requested
      if (aggregation && this.config.aggregationLevels.includes(aggregation)) {
        return this.aggregateOrderBook(limitedOrderBook, aggregation);
      }
      
      return limitedOrderBook;
      
    } catch (error) {
      console.error(`Error getting order book for ${marketSymbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get order book from Redis cache
   */
  async getOrderBookFromRedis(marketSymbol) {
    try {
      const cached = await redis.get(`orderbook:${marketSymbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Error getting order book from Redis for ${marketSymbol}:`, error);
      return null;
    }
  }
  
  /**
   * Cache order book in Redis
   */
  async cacheOrderBookInRedis(marketSymbol, orderBook) {
    try {
      await redis.set(
        `orderbook:${marketSymbol}`,
        JSON.stringify(orderBook),
        { EX: this.config.redisExpiry }
      );
    } catch (error) {
      console.error(`Error caching order book in Redis for ${marketSymbol}:`, error);
      // Continue without caching to prevent unhandled rejection
    }
  }
  
  /**
   * Handle order update
   */
  async handleOrderUpdate({ order, market, action }) {
    const marketSymbol = market.symbol;
    
    try {
      // Update in-memory order book
      await this.updateOrderBookInMemory(marketSymbol, order, action);
      
      // Broadcast update to subscribers
      this.broadcastOrderBookUpdate(marketSymbol, {
        type: 'orderUpdate',
        action,
        order: {
          id: order.id,
          side: order.side,
          price: order.price,
          quantity: order.quantity_remaining
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error handling order update for ${marketSymbol}:`, error);
    }
  }
  
  /**
   * Handle trade execution
   */
  async handleTradeExecuted({ trade, market }) {
    const marketSymbol = market.symbol;
    
    try {
      // Refresh order book after trade
      await this.refreshOrderBook(marketSymbol);
      
      // Broadcast trade update
      this.broadcastOrderBookUpdate(marketSymbol, {
        type: 'trade',
        trade: {
          price: trade.price,
          quantity: trade.quantity,
          side: trade.side,
          timestamp: trade.created_at
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error handling trade execution for ${marketSymbol}:`, error);
    }
  }
  
  /**
   * Handle order cancellation
   */
  async handleOrderCancelled({ order, market }) {
    const marketSymbol = market.symbol;
    
    try {
      // Remove order from order book
      await this.updateOrderBookInMemory(marketSymbol, order, 'remove');
      
      // Broadcast cancellation
      this.broadcastOrderBookUpdate(marketSymbol, {
        type: 'orderCancelled',
        order: {
          id: order.id,
          side: order.side,
          price: order.price
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error handling order cancellation for ${marketSymbol}:`, error);
    }
  }
  
  /**
   * Update order book in memory
   */
  async updateOrderBookInMemory(marketSymbol, order, action) {
    const orderBook = this.orderBooks.get(marketSymbol);
    
    if (!orderBook) {
      // Initialize if not exists
      await this.initializeOrderBook(marketSymbol);
      return;
    }
    
    const price = parseFloat(order.price);
    const quantity = parseFloat(order.quantity_remaining);
    const side = order.side === 'buy' ? 'bids' : 'asks';
    
    // Find price level
    const priceLevel = orderBook[side].find(level => level[0] === price);
    
    switch (action) {
      case 'add':
        if (priceLevel) {
          priceLevel[1] += quantity;
        } else {
          orderBook[side].push([price, quantity]);
          // Re-sort
          this.sortOrderBook(orderBook, side);
        }
        break;
        
      case 'update':
        if (priceLevel) {
          priceLevel[1] = quantity;
          if (quantity <= 0) {
            // Remove empty price level
            const index = orderBook[side].indexOf(priceLevel);
            orderBook[side].splice(index, 1);
          }
        }
        break;
        
      case 'remove':
        if (priceLevel) {
          const index = orderBook[side].indexOf(priceLevel);
          orderBook[side].splice(index, 1);
        }
        break;
    }
    
    // Update timestamp and sequence
    orderBook.timestamp = new Date().toISOString();
    orderBook.sequence = Date.now();
    
    // Limit depth
    orderBook.bids = orderBook.bids.slice(0, this.config.maxDepth);
    orderBook.asks = orderBook.asks.slice(0, this.config.maxDepth);
  }
  
  /**
   * Sort order book
   */
  sortOrderBook(orderBook, side) {
    if (side === 'bids') {
      // Bids: highest price first
      orderBook.bids.sort((a, b) => b[0] - a[0]);
    } else {
      // Asks: lowest price first
      orderBook.asks.sort((a, b) => a[0] - b[0]);
    }
  }
  
  /**
   * Refresh order book from database
   */
  async refreshOrderBook(marketSymbol) {
    try {
      const market = await Market.findOne({ where: { symbol: marketSymbol } });
      
      if (!market) {
        throw new Error(`Market ${marketSymbol} not found`);
      }
      
      const orderBook = await this.loadOrderBookFromDB(market.id);
      
      // Update caches
      this.orderBooks.set(marketSymbol, orderBook);
      await this.cacheOrderBookInRedis(marketSymbol, orderBook);
      
      return orderBook;
      
    } catch (error) {
      console.error(`Error refreshing order book for ${marketSymbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Aggregate order book by price levels
   */
  aggregateOrderBook(orderBook, tickSize) {
    const aggregateSide = (orders) => {
      const aggregated = new Map();
      
      for (const [price, quantity] of orders) {
        const aggregatedPrice = Math.floor(price / tickSize) * tickSize;
        
        if (aggregated.has(aggregatedPrice)) {
          aggregated.set(aggregatedPrice, aggregated.get(aggregatedPrice) + quantity);
        } else {
          aggregated.set(aggregatedPrice, quantity);
        }
      }
      
      return Array.from(aggregated.entries());
    };
    
    return {
      ...orderBook,
      bids: aggregateSide(orderBook.bids).sort((a, b) => b[0] - a[0]),
      asks: aggregateSide(orderBook.asks).sort((a, b) => a[0] - b[0])
    };
  }
  
  /**
   * Get order book statistics
   */
  async getOrderBookStats(marketSymbol) {
    const orderBook = await this.getOrderBook(marketSymbol);
    
    if (!orderBook || !orderBook.bids.length || !orderBook.asks.length) {
      return null;
    }
    
    const bestBid = orderBook.bids[0];
    const bestAsk = orderBook.asks[0];
    const spread = bestAsk[0] - bestBid[0];
    const spreadPercent = (spread / bestBid[0]) * 100;
    
    // Calculate depth
    const bidDepth = orderBook.bids.reduce((sum, [, quantity]) => sum + quantity, 0);
    const askDepth = orderBook.asks.reduce((sum, [, quantity]) => sum + quantity, 0);
    
    return {
      symbol: marketSymbol,
      bestBid: bestBid[0],
      bestAsk: bestAsk[0],
      spread,
      spreadPercent,
      bidDepth,
      askDepth,
      totalDepth: bidDepth + askDepth,
      timestamp: orderBook.timestamp
    };
  }
  
  /**
   * Subscribe to order book updates
   */
  subscribe(marketSymbol, callback) {
    if (!this.subscribers.has(marketSymbol)) {
      this.subscribers.set(marketSymbol, new Set());
    }
    
    this.subscribers.get(marketSymbol).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(marketSymbol);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(marketSymbol);
          this.stopPeriodicUpdates(marketSymbol);
        }
      }
    };
  }
  
  /**
   * Broadcast order book update to subscribers
   */
  broadcastOrderBookUpdate(marketSymbol, update) {
    const subscribers = this.subscribers.get(marketSymbol);
    
    if (subscribers && subscribers.size > 0) {
      for (const callback of subscribers) {
        try {
          callback(update);
        } catch (error) {
          console.error('Error broadcasting order book update:', error);
        }
      }
    }
  }
  
  /**
   * Start periodic updates for a market
   */
  startPeriodicUpdates(marketSymbol) {
    if (this.updateIntervals.has(marketSymbol)) {
      return; // Already running
    }
    
    const interval = setInterval(async () => {
      try {
        const orderBook = this.orderBooks.get(marketSymbol);
        if (orderBook && this.subscribers.has(marketSymbol)) {
          // Cache in Redis periodically
          await this.cacheOrderBookInRedis(marketSymbol, orderBook);
          
          // Broadcast full order book update
          this.broadcastOrderBookUpdate(marketSymbol, {
            type: 'snapshot',
            data: await this.getOrderBook(marketSymbol, 20),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error in periodic update for ${marketSymbol}:`, error);
      }
    }, this.config.updateInterval);
    
    this.updateIntervals.set(marketSymbol, interval);
  }
  
  /**
   * Stop periodic updates for a market
   */
  stopPeriodicUpdates(marketSymbol) {
    const interval = this.updateIntervals.get(marketSymbol);
    
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(marketSymbol);
    }
  }
  
  /**
   * Get multiple order books
   */
  async getMultipleOrderBooks(marketSymbols, depth = 10) {
    const orderBooks = {};
    
    await Promise.all(
      marketSymbols.map(async (symbol) => {
        try {
          orderBooks[symbol] = await this.getOrderBook(symbol, depth);
        } catch (error) {
          console.error(`Error getting order book for ${symbol}:`, error);
          orderBooks[symbol] = null;
        }
      })
    );
    
    return orderBooks;
  }
  
  /**
   * Clear order book cache
   */
  async clearCache(marketSymbol = null) {
    if (marketSymbol) {
      // Clear specific market
      this.orderBooks.delete(marketSymbol);
      await redis.del(`orderbook:${marketSymbol}`);
    } else {
      // Clear all
      this.orderBooks.clear();
      const keys = await redis.keys('orderbook:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      inMemoryMarkets: this.orderBooks.size,
      activeSubscriptions: this.subscribers.size,
      activeUpdates: this.updateIntervals.size,
      markets: Array.from(this.orderBooks.keys())
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop all periodic updates
    for (const [marketSymbol] of this.updateIntervals) {
      this.stopPeriodicUpdates(marketSymbol);
    }
    
    // Clear all caches
    this.orderBooks.clear();
    this.subscribers.clear();
    
    console.log('Order book manager cleaned up');
  }
}

// Create singleton instance
const orderBookManager = new OrderBookManager();

module.exports = orderBookManager;