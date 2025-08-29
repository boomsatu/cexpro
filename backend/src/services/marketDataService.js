const { client: redis } = require('../config/redis');
const { Op } = require('sequelize');
const Trade = require('../models/Trade');
const Market = require('../models/Market');
const EventEmitter = require('events');

/**
 * Market Data Service
 * Mengelola distribusi real-time market data, candlestick generation,
 * dan ticker updates
 */
class MarketDataService extends EventEmitter {
  constructor() {
    super();
    this.tickers = new Map(); // Current ticker data
    this.candlesticks = new Map(); // Candlestick data cache
    this.subscribers = new Map(); // WebSocket subscribers
    this.intervals = new Map(); // Update intervals
    
    // Configuration
    this.config = {
      tickerUpdateInterval: 1000, // 1 second
      candlestickIntervals: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
      redisExpiry: 3600, // 1 hour
      maxCandlesticks: 1000,
      priceChangeWindow: 24 * 60 * 60 * 1000 // 24 hours in ms
    };
    
    this.setupEventListeners();
    this.initializeIntervals();
  }
  
  setupEventListeners() {
    // Listen for new trades
    this.on('newTrade', this.handleNewTrade.bind(this));
    
    // Listen for market updates
    this.on('marketUpdate', this.handleMarketUpdate.bind(this));
  }
  
  /**
   * Initialize update intervals
   */
  initializeIntervals() {
    // Ticker updates DISABLED temporarily for performance testing
    console.log('⚠️  Ticker updates disabled for performance testing');
    // this.intervals.set('ticker', setInterval(async () => {
    //   try {
    //     await this.updateAllTickers();
    //   } catch (error) {
    //     console.error('Error in ticker update interval:', error);
    //     // Don't rethrow to prevent unhandled rejection
    //   }
    // }, this.config.tickerUpdateInterval));
    
    // Candlestick updates with proper error handling
    this.intervals.set('candlestick', setInterval(async () => {
      try {
        await this.updateAllCandlesticks();
      } catch (error) {
        console.error('Error in candlestick update interval:', error);
        // Don't rethrow to prevent unhandled rejection
      }
    }, 60000)); // Every minute
    
    console.log('Market data intervals initialized with error handling');
  }
  
  /**
   * Handle new trade
   */
  async handleNewTrade({ trade, market }) {
    try {
      // Update ticker
      await this.updateTicker(market.symbol, trade);
      
      // Update candlesticks
      await this.updateCandlesticks(market.symbol, trade);
      
      // Broadcast trade data
      this.broadcastTradeData(market.symbol, {
        type: 'trade',
        data: {
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.quantity),
          side: trade.side,
          timestamp: trade.created_at
        }
      });
      
    } catch (error) {
      console.error(`Error handling new trade for ${market.symbol}:`, error);
    }
  }
  
  /**
   * Update ticker data
   */
  async updateTicker(marketSymbol, trade = null) {
    try {
      const market = await Market.findOne({ where: { symbol: marketSymbol } });
      
      if (!market) {
        throw new Error(`Market ${marketSymbol} not found`);
      }
      
      // Get 24h statistics
      const stats24h = await this.get24hStats(marketSymbol);
      
      // Current ticker data
      let ticker = this.tickers.get(marketSymbol) || {
        symbol: marketSymbol,
        lastPrice: parseFloat(market.last_price),
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        change24h: 0,
        changePercent24h: 0,
        bid: 0,
        ask: 0,
        bidSize: 0,
        askSize: 0,
        timestamp: new Date().toISOString()
      };
      
      // Update with trade data if provided
      if (trade) {
        ticker.lastPrice = parseFloat(trade.price);
        ticker.timestamp = new Date().toISOString();
      }
      
      // Update with 24h stats
      if (stats24h) {
        ticker.volume24h = stats24h.volume;
        ticker.high24h = stats24h.high;
        ticker.low24h = stats24h.low;
        ticker.change24h = stats24h.change;
        ticker.changePercent24h = stats24h.changePercent;
      }
      
      // Get best bid/ask from order book
      const orderBookStats = await this.getOrderBookStats(marketSymbol);
      if (orderBookStats) {
        ticker.bid = orderBookStats.bestBid || 0;
        ticker.ask = orderBookStats.bestAsk || 0;
        ticker.bidSize = orderBookStats.bidSize || 0;
        ticker.askSize = orderBookStats.askSize || 0;
      }
      
      // Cache ticker
      this.tickers.set(marketSymbol, ticker);
      
      // Cache in Redis with error handling
      try {
        await redis.set(
          `ticker:${marketSymbol}`,
          JSON.stringify(ticker),
          { EX: this.config.redisExpiry }
        );
      } catch (redisError) {
        console.error(`Redis cache error for ticker ${marketSymbol}:`, redisError);
        // Continue without caching to prevent unhandled rejection
      }
      
      // Broadcast ticker update
      this.broadcastTickerData(marketSymbol, ticker);
      
      return ticker;
      
    } catch (error) {
      console.error(`Error updating ticker for ${marketSymbol}:`, error);
      // Return a default ticker instead of throwing to prevent unhandled rejection
      return {
        symbol: marketSymbol,
        lastPrice: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        change24h: 0,
        changePercent24h: 0,
        bid: 0,
        ask: 0,
        bidSize: 0,
        askSize: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get 24h statistics
   */
  async get24hStats(marketSymbol) {
    try {
      const market = await Market.findOne({ where: { symbol: marketSymbol } });
      
      if (!market) {
        return null;
      }
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - this.config.priceChangeWindow);
      
      // Get trades from last 24 hours
      const trades = await Trade.findAll({
        where: {
          trading_pair_id: market.id,
          created_at: {
            [Op.gte]: yesterday
          }
        },
        order: [['created_at', 'ASC']],
        attributes: ['price', 'quantity', 'created_at']
      });
      
      if (trades.length === 0) {
        return {
          volume: 0,
          high: parseFloat(market.last_price),
          low: parseFloat(market.last_price),
          change: 0,
          changePercent: 0,
          openPrice: parseFloat(market.last_price)
        };
      }
      
      // Calculate statistics
      const prices = trades.map(t => parseFloat(t.price));
      const volumes = trades.map(t => parseFloat(t.quantity));
      
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const volume = volumes.reduce((sum, vol) => sum + vol, 0);
      const openPrice = prices[0];
      const currentPrice = parseFloat(market.last_price);
      const change = currentPrice - openPrice;
      const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;
      
      return {
        volume,
        high,
        low,
        change,
        changePercent,
        openPrice
      };
      
    } catch (error) {
      console.error(`Error getting 24h stats for ${marketSymbol}:`, error);
      return null;
    }
  }
  
  /**
   * Update candlesticks
   */
  async updateCandlesticks(marketSymbol, trade) {
    try {
      const tradeTime = new Date(trade.created_at);
      const price = parseFloat(trade.price);
      const volume = parseFloat(trade.quantity);
      
      // Update candlesticks for all intervals
      for (const interval of this.config.candlestickIntervals) {
        await this.updateCandlestickForInterval(marketSymbol, interval, tradeTime, price, volume);
      }
      
    } catch (error) {
      console.error(`Error updating candlesticks for ${marketSymbol}:`, error);
    }
  }
  
  /**
   * Update candlestick for specific interval
   */
  async updateCandlestickForInterval(marketSymbol, interval, tradeTime, price, volume) {
    try {
      const candlestickTime = this.getCandlestickTime(tradeTime, interval);
      const key = `${marketSymbol}:${interval}`;
      
      // Get current candlesticks
      let candlesticks = this.candlesticks.get(key) || [];
      
      // Find or create current candlestick
      let currentCandle = candlesticks.find(c => c.timestamp === candlestickTime.getTime());
      
      if (!currentCandle) {
        // Create new candlestick
        currentCandle = {
          timestamp: candlestickTime.getTime(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
          trades: 0
        };
        
        candlesticks.push(currentCandle);
        
        // Sort by timestamp
        candlesticks.sort((a, b) => a.timestamp - b.timestamp);
        
        // Limit array size
        if (candlesticks.length > this.config.maxCandlesticks) {
          candlesticks = candlesticks.slice(-this.config.maxCandlesticks);
        }
      }
      
      // Update candlestick
      currentCandle.high = Math.max(currentCandle.high, price);
      currentCandle.low = Math.min(currentCandle.low, price);
      currentCandle.close = price;
      currentCandle.volume += volume;
      currentCandle.trades += 1;
      
      // Cache updated candlesticks
      this.candlesticks.set(key, candlesticks);
      
      // Cache in Redis with error handling
      try {
        await redis.set(
          `candlesticks:${key}`,
          JSON.stringify(candlesticks.slice(-100)), // Store last 100 candles
          { EX: this.config.redisExpiry }
        );
      } catch (redisError) {
        console.error(`Redis cache error for candlesticks ${key}:`, redisError);
        // Continue without caching to prevent unhandled rejection
      }
      
      // Broadcast candlestick update
      this.broadcastCandlestickData(marketSymbol, interval, currentCandle);
      
    } catch (error) {
      console.error(`Error updating candlestick for ${marketSymbol} ${interval}:`, error);
    }
  }
  
  /**
   * Get candlestick time based on interval
   */
  getCandlestickTime(tradeTime, interval) {
    const time = new Date(tradeTime);
    
    switch (interval) {
      case '1m':
        time.setSeconds(0, 0);
        break;
      case '5m':
        time.setMinutes(Math.floor(time.getMinutes() / 5) * 5, 0, 0);
        break;
      case '15m':
        time.setMinutes(Math.floor(time.getMinutes() / 15) * 15, 0, 0);
        break;
      case '30m':
        time.setMinutes(Math.floor(time.getMinutes() / 30) * 30, 0, 0);
        break;
      case '1h':
        time.setMinutes(0, 0, 0);
        break;
      case '4h':
        time.setHours(Math.floor(time.getHours() / 4) * 4, 0, 0, 0);
        break;
      case '1d':
        time.setHours(0, 0, 0, 0);
        break;
      case '1w':
        const dayOfWeek = time.getDay();
        time.setDate(time.getDate() - dayOfWeek);
        time.setHours(0, 0, 0, 0);
        break;
      default:
        time.setSeconds(0, 0);
    }
    
    return time;
  }
  
  /**
   * Get ticker data
   */
  async getTicker(marketSymbol) {
    try {
      // Try memory cache first
      let ticker = this.tickers.get(marketSymbol);
      
      if (!ticker) {
        // Try Redis cache
        const cached = await redis.get(`ticker:${marketSymbol}`);
        if (cached) {
          ticker = JSON.parse(cached);
          this.tickers.set(marketSymbol, ticker);
        } else {
          // Generate fresh ticker
          ticker = await this.updateTicker(marketSymbol);
        }
      }
      
      return ticker;
      
    } catch (error) {
      console.error(`Error getting ticker for ${marketSymbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all tickers
   */
  async getAllTickers() {
    try {
      const markets = await Market.findAll({
        where: { is_active: true },
        attributes: ['symbol']
      });
      
      const tickers = {};
      
      await Promise.all(
        markets.map(async (market) => {
          try {
            tickers[market.symbol] = await this.getTicker(market.symbol);
          } catch (error) {
            console.error(`Error getting ticker for ${market.symbol}:`, error);
          }
        })
      );
      
      return tickers;
      
    } catch (error) {
      console.error('Error getting all tickers:', error);
      throw error;
    }
  }
  
  /**
   * Get candlesticks
   */
  async getCandlesticks(marketSymbol, interval, limit = 100, startTime = null, endTime = null) {
    try {
      if (!this.config.candlestickIntervals.includes(interval)) {
        throw new Error(`Invalid interval: ${interval}`);
      }
      
      const key = `${marketSymbol}:${interval}`;
      
      // Try memory cache first
      let candlesticks = this.candlesticks.get(key);
      
      if (!candlesticks) {
        // Try Redis cache
        const cached = await redis.get(`candlesticks:${key}`);
        if (cached) {
          candlesticks = JSON.parse(cached);
          this.candlesticks.set(key, candlesticks);
        } else {
          // Generate from database
          candlesticks = await this.generateCandlesticksFromDB(marketSymbol, interval, limit);
        }
      }
      
      if (!candlesticks) {
        return [];
      }
      
      // Apply filters
      let filtered = candlesticks;
      
      if (startTime) {
        filtered = filtered.filter(c => c.timestamp >= startTime);
      }
      
      if (endTime) {
        filtered = filtered.filter(c => c.timestamp <= endTime);
      }
      
      // Apply limit
      if (limit) {
        filtered = filtered.slice(-limit);
      }
      
      return filtered;
      
    } catch (error) {
      console.error(`Error getting candlesticks for ${marketSymbol} ${interval}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate candlesticks from database
   */
  async generateCandlesticksFromDB(marketSymbol, interval, limit) {
    try {
      const market = await Market.findOne({ where: { symbol: marketSymbol } });
      
      if (!market) {
        throw new Error(`Market ${marketSymbol} not found`);
      }
      
      // Calculate time range
      const now = new Date();
      const intervalMs = this.getIntervalMs(interval);
      const startTime = new Date(now.getTime() - (limit * intervalMs));
      
      // Get trades
      const trades = await Trade.findAll({
        where: {
          trading_pair_id: market.id,
          created_at: {
            [Op.gte]: startTime
          }
        },
        order: [['created_at', 'ASC']],
        attributes: ['price', 'quantity', 'created_at']
      });
      
      // Group trades by candlestick periods
      const candlestickMap = new Map();
      
      for (const trade of trades) {
        const candleTime = this.getCandlestickTime(trade.created_at, interval);
        const key = candleTime.getTime();
        const price = parseFloat(trade.price);
        const volume = parseFloat(trade.quantity);
        
        if (!candlestickMap.has(key)) {
          candlestickMap.set(key, {
            timestamp: key,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
            trades: 0
          });
        }
        
        const candle = candlestickMap.get(key);
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
        candle.trades += 1;
      }
      
      // Convert to array and sort
      const candlesticks = Array.from(candlestickMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Cache the result
      const key = `${marketSymbol}:${interval}`;
      this.candlesticks.set(key, candlesticks);
      
      return candlesticks;
      
    } catch (error) {
      console.error(`Error generating candlesticks from DB for ${marketSymbol} ${interval}:`, error);
      return [];
    }
  }
  
  /**
   * Get interval in milliseconds
   */
  getIntervalMs(interval) {
    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    return intervals[interval] || 60 * 1000;
  }
  
  /**
   * Get order book statistics
   */
  async getOrderBookStats(marketSymbol) {
    try {
      // This would integrate with OrderBookManager
      // For now, return mock data
      return {
        bestBid: 0,
        bestAsk: 0,
        bidSize: 0,
        askSize: 0
      };
    } catch (error) {
      console.error(`Error getting order book stats for ${marketSymbol}:`, error);
      return null;
    }
  }
  
  /**
   * Subscribe to market data updates
   */
  subscribe(marketSymbol, dataType, callback) {
    const key = `${marketSymbol}:${dataType}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }
  
  /**
   * Broadcast ticker data
   */
  broadcastTickerData(marketSymbol, ticker) {
    const key = `${marketSymbol}:ticker`;
    const subscribers = this.subscribers.get(key);
    
    if (subscribers && subscribers.size > 0) {
      const update = {
        type: 'ticker',
        symbol: marketSymbol,
        data: ticker,
        timestamp: new Date().toISOString()
      };
      
      for (const callback of subscribers) {
        try {
          callback(update);
        } catch (error) {
          console.error('Error broadcasting ticker data:', error);
        }
      }
    }
  }
  
  /**
   * Broadcast trade data
   */
  broadcastTradeData(marketSymbol, tradeData) {
    const key = `${marketSymbol}:trades`;
    const subscribers = this.subscribers.get(key);
    
    if (subscribers && subscribers.size > 0) {
      const update = {
        ...tradeData,
        symbol: marketSymbol,
        timestamp: new Date().toISOString()
      };
      
      for (const callback of subscribers) {
        try {
          callback(update);
        } catch (error) {
          console.error('Error broadcasting trade data:', error);
        }
      }
    }
  }
  
  /**
   * Broadcast candlestick data
   */
  broadcastCandlestickData(marketSymbol, interval, candlestick) {
    const key = `${marketSymbol}:candlesticks:${interval}`;
    const subscribers = this.subscribers.get(key);
    
    if (subscribers && subscribers.size > 0) {
      const update = {
        type: 'candlestick',
        symbol: marketSymbol,
        interval,
        data: candlestick,
        timestamp: new Date().toISOString()
      };
      
      for (const callback of subscribers) {
        try {
          callback(update);
        } catch (error) {
          console.error('Error broadcasting candlestick data:', error);
        }
      }
    }
  }
  
  /**
   * Update all tickers
   */
  async updateAllTickers() {
    try {
      const markets = await Market.findAll({
        where: { is_active: true },
        attributes: ['symbol']
      });
      
      await Promise.all(
        markets.map(async (market) => {
          try {
            await this.updateTicker(market.symbol);
          } catch (error) {
            console.error(`Error updating ticker for ${market.symbol}:`, error);
          }
        })
      );
      
    } catch (error) {
      console.error('Error updating all tickers:', error);
    }
  }
  
  /**
   * Update all candlesticks
   */
  async updateAllCandlesticks() {
    try {
      // This would be called periodically to ensure candlesticks are up to date
      // Implementation depends on specific requirements
      console.log('Updating all candlesticks...');
    } catch (error) {
      console.error('Error updating all candlesticks:', error);
    }
  }
  
  /**
   * Handle new trade event
   */
  async handleNewTrade(tradeData) {
    try {
      const { marketSymbol, price, quantity, timestamp } = tradeData;
      
      // Update ticker with new trade
      await this.updateTickerFromTrade(marketSymbol, price, quantity, timestamp);
      
      // Update candlestick data
      await this.updateCandlestickFromTrade(marketSymbol, price, quantity, timestamp);
      
      // Broadcast to subscribers
      this.broadcastToSubscribers('trade', {
        symbol: marketSymbol,
        price,
        quantity,
        timestamp
      });
      
    } catch (error) {
      console.error('Error handling new trade:', error);
    }
  }
  
  /**
   * Handle market update event
   */
  async handleMarketUpdate(updateData) {
    try {
      const { marketSymbol, type, data } = updateData;
      
      switch (type) {
        case 'price_update':
          await this.updateMarketPrice(marketSymbol, data.price);
          break;
        case 'volume_update':
          await this.updateMarketVolume(marketSymbol, data.volume);
          break;
        case 'ticker_update':
          await this.updateTicker(marketSymbol, data);
          break;
        default:
          console.warn('Unknown market update type:', type);
      }
      
      // Broadcast to subscribers
      this.broadcastToSubscribers('market_update', {
        symbol: marketSymbol,
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error handling market update:', error);
    }
  }
  
  /**
   * Update ticker from trade data
   */
  async updateTickerFromTrade(marketSymbol, price, quantity, timestamp) {
    try {
      const ticker = this.tickers.get(marketSymbol) || {
        symbol: marketSymbol,
        price: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        change24h: 0,
        changePercent24h: 0,
        lastUpdate: timestamp
      };
      
      // Update price
      const oldPrice = ticker.price;
      ticker.price = price;
      ticker.lastUpdate = timestamp;
      
      // Update 24h stats (simplified - in production, use proper time windows)
      if (price > ticker.high24h || ticker.high24h === 0) {
        ticker.high24h = price;
      }
      if (price < ticker.low24h || ticker.low24h === 0) {
        ticker.low24h = price;
      }
      
      // Update volume
      ticker.volume24h += quantity;
      
      // Calculate change
      if (oldPrice > 0) {
        ticker.change24h = price - oldPrice;
        ticker.changePercent24h = ((price - oldPrice) / oldPrice) * 100;
      }
      
      this.tickers.set(marketSymbol, ticker);
      
    } catch (error) {
      console.error('Error updating ticker from trade:', error);
    }
  }
  
  /**
   * Update candlestick from trade data
   */
  async updateCandlestickFromTrade(marketSymbol, price, quantity, timestamp) {
    try {
      const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
      
      for (const interval of intervals) {
        const candlestickKey = `${marketSymbol}:${interval}`;
        let candlesticks = this.candlesticks.get(candlestickKey) || [];
        
        const candleTime = this.getCandleTime(timestamp, interval);
        
        // Find or create current candle
        let currentCandle = candlesticks.find(c => c.timestamp === candleTime);
        
        if (!currentCandle) {
          currentCandle = {
            timestamp: candleTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0
          };
          candlesticks.push(currentCandle);
        }
        
        // Update candle
        currentCandle.close = price;
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.volume += quantity;
        
        // Keep only last 1000 candles
        if (candlesticks.length > 1000) {
          candlesticks = candlesticks.slice(-1000);
        }
        
        this.candlesticks.set(candlestickKey, candlesticks);
      }
      
    } catch (error) {
      console.error('Error updating candlestick from trade:', error);
    }
  }
  
  /**
   * Broadcast data to subscribers
   */
  broadcastToSubscribers(type, data) {
    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      
      // In a real implementation, this would broadcast via WebSocket
      // For now, we'll emit an event that can be listened to
      this.emit('broadcast', message);
      
    } catch (error) {
      console.error('Error broadcasting to subscribers:', error);
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats() {
    try {
      const tickers = await this.getAllTickers();
      
      const stats = {
        totalMarkets: Object.keys(tickers).length,
        totalVolume24h: 0,
        topGainers: [],
        topLosers: [],
        timestamp: new Date().toISOString()
      };
      
      // Calculate statistics
      const tickerArray = Object.values(tickers);
      
      stats.totalVolume24h = tickerArray.reduce((sum, ticker) => {
        return sum + (ticker.volume24h || 0);
      }, 0);
      
      // Top gainers and losers
      const sortedByChange = tickerArray
        .filter(ticker => ticker.changePercent24h !== undefined)
        .sort((a, b) => b.changePercent24h - a.changePercent24h);
      
      stats.topGainers = sortedByChange.slice(0, 10);
      stats.topLosers = sortedByChange.slice(-10).reverse();
      
      return stats;
      
    } catch (error) {
      console.error('Error getting market stats:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    
    // Clear caches
    this.tickers.clear();
    this.candlesticks.clear();
    this.subscribers.clear();
    this.intervals.clear();
    
    console.log('Market data service cleaned up');
  }
}

// Create singleton instance
const marketDataService = new MarketDataService();

module.exports = marketDataService;