const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const User = require('../models/User');
const marketDataService = require('./marketDataService');
const orderBookManager = require('./orderBookManager');
const orderMatchingEngine = require('./orderMatchingEngine');
const EventEmitter = require('events');

/**
 * WebSocket Trading Service
 * Mengelola real-time WebSocket connections untuk trading,
 * market data streaming, dan user notifications
 */
class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map(); // clientId -> client info
    this.subscriptions = new Map(); // subscription key -> Set of clientIds
    this.userConnections = new Map(); // userId -> Set of clientIds
    this.rateLimits = new Map(); // clientId -> rate limit info
    
    // Configuration
    this.config = {
      port: process.env.WS_PORT || 8080,
      maxConnections: 10000,
      heartbeatInterval: 30000, // 30 seconds
      rateLimitWindow: 60000, // 1 minute
      maxRequestsPerWindow: 100,
      maxSubscriptionsPerClient: 50,
      authRequired: true
    };
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize WebSocket server
   */
  initialize() {
    this.wss = new WebSocket.Server({
      port: this.config.port,
      maxPayload: 16 * 1024, // 16KB
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          chunkSize: 1024
        },
        threshold: 1024,
        concurrencyLimit: 10
      }
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
    
    // Setup heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
    
    console.log(`WebSocket server started on port ${this.config.port}`);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen to market data updates
    marketDataService.on('tickerUpdate', (data) => {
      this.broadcastToSubscribers(`ticker:${data.symbol}`, {
        type: 'ticker',
        data
      });
    });
    
    marketDataService.on('tradeUpdate', (data) => {
      this.broadcastToSubscribers(`trades:${data.symbol}`, {
        type: 'trade',
        data
      });
    });
    
    marketDataService.on('candlestickUpdate', (data) => {
      this.broadcastToSubscribers(`candlesticks:${data.symbol}:${data.interval}`, {
        type: 'candlestick',
        data
      });
    });
    
    // Listen to order book updates
    orderBookManager.on('orderBookUpdate', (data) => {
      this.broadcastToSubscribers(`orderbook:${data.symbol}`, {
        type: 'orderbook',
        data
      });
    });
    
    // Listen to order updates
    orderMatchingEngine.on('orderUpdate', (data) => {
      this.sendToUser(data.userId, {
        type: 'orderUpdate',
        data
      });
    });
    
    orderMatchingEngine.on('tradeExecution', (data) => {
      // Send to both maker and taker
      this.sendToUser(data.makerId, {
        type: 'tradeExecution',
        data: { ...data, side: 'maker' }
      });
      
      this.sendToUser(data.takerId, {
        type: 'tradeExecution',
        data: { ...data, side: 'taker' }
      });
    });
  }
  
  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, request) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      userId: null,
      authenticated: false,
      subscriptions: new Set(),
      lastActivity: Date.now(),
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent']
    };
    
    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1013, 'Server overloaded');
      return;
    }
    
    this.clients.set(clientId, clientInfo);
    
    // Setup message handler
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });
    
    // Setup close handler
    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });
    
    // Setup error handler
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });
    
    // Setup ping/pong
    ws.on('pong', () => {
      clientInfo.lastActivity = Date.now();
    });
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        authRequired: this.config.authRequired
      }
    });
    
    console.log(`New WebSocket connection: ${clientId} from ${clientInfo.ip}`);
  }
  
  /**
   * Handle incoming message
   */
  async handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      // Update last activity
      client.lastActivity = Date.now();
      
      // Rate limiting
      if (!this.checkRateLimit(clientId)) {
        this.sendError(clientId, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
        return;
      }
      
      // Parse message
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (error) {
        this.sendError(clientId, 'INVALID_JSON', 'Invalid JSON format');
        return;
      }
      
      // Validate message structure
      if (!message.type || !message.id) {
        this.sendError(clientId, 'INVALID_MESSAGE', 'Message must have type and id');
        return;
      }
      
      // Handle message based on type
      await this.handleMessageByType(clientId, message);
      
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
      this.sendError(clientId, 'INTERNAL_ERROR', 'Internal server error');
    }
  }
  
  /**
   * Handle message by type
   */
  async handleMessageByType(clientId, message) {
    const client = this.clients.get(clientId);
    const { type, id, data } = message;
    
    switch (type) {
      case 'auth':
        await this.handleAuth(clientId, id, data);
        break;
        
      case 'subscribe':
        await this.handleSubscribe(clientId, id, data);
        break;
        
      case 'unsubscribe':
        await this.handleUnsubscribe(clientId, id, data);
        break;
        
      case 'placeOrder':
        await this.handlePlaceOrder(clientId, id, data);
        break;
        
      case 'cancelOrder':
        await this.handleCancelOrder(clientId, id, data);
        break;
        
      case 'getOrderBook':
        await this.handleGetOrderBook(clientId, id, data);
        break;
        
      case 'getTicker':
        await this.handleGetTicker(clientId, id, data);
        break;
        
      case 'getCandlesticks':
        await this.handleGetCandlesticks(clientId, id, data);
        break;
        
      case 'getOrders':
        await this.handleGetOrders(clientId, id, data);
        break;
        
      case 'getTrades':
        await this.handleGetTrades(clientId, id, data);
        break;
        
      case 'ping':
        this.sendResponse(clientId, id, 'pong', { timestamp: Date.now() });
        break;
        
      default:
        this.sendError(clientId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${type}`, id);
    }
  }
  
  /**
   * Handle authentication
   */
  async handleAuth(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!data.token) {
        this.sendError(clientId, 'MISSING_TOKEN', 'Authentication token required', messageId);
        return;
      }
      
      // Verify JWT token
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.is_active) {
        this.sendError(clientId, 'INVALID_USER', 'User not found or inactive', messageId);
        return;
      }
      
      // Update client info
      client.userId = user.id;
      client.authenticated = true;
      
      // Add to user connections
      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, new Set());
      }
      this.userConnections.get(user.id).add(clientId);
      
      // Send success response
      this.sendResponse(clientId, messageId, 'authSuccess', {
        userId: user.id,
        username: user.username
      });
      
      console.log(`Client ${clientId} authenticated as user ${user.id}`);
      
    } catch (error) {
      console.error(`Authentication error for client ${clientId}:`, error);
      this.sendError(clientId, 'AUTH_FAILED', 'Authentication failed', messageId);
    }
  }
  
  /**
   * Handle subscription
   */
  async handleSubscribe(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!data.channel) {
        this.sendError(clientId, 'MISSING_CHANNEL', 'Channel required for subscription', messageId);
        return;
      }
      
      // Check subscription limit
      if (client.subscriptions.size >= this.config.maxSubscriptionsPerClient) {
        this.sendError(clientId, 'SUBSCRIPTION_LIMIT', 'Maximum subscriptions exceeded', messageId);
        return;
      }
      
      // Validate channel format
      if (!this.isValidChannel(data.channel)) {
        this.sendError(clientId, 'INVALID_CHANNEL', 'Invalid channel format', messageId);
        return;
      }
      
      // Add subscription
      client.subscriptions.add(data.channel);
      
      if (!this.subscriptions.has(data.channel)) {
        this.subscriptions.set(data.channel, new Set());
      }
      this.subscriptions.get(data.channel).add(clientId);
      
      // Send success response
      this.sendResponse(clientId, messageId, 'subscribed', {
        channel: data.channel
      });
      
      // Send initial data if available
      await this.sendInitialData(clientId, data.channel);
      
    } catch (error) {
      console.error(`Subscription error for client ${clientId}:`, error);
      this.sendError(clientId, 'SUBSCRIPTION_FAILED', 'Subscription failed', messageId);
    }
  }
  
  /**
   * Handle unsubscription
   */
  async handleUnsubscribe(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!data.channel) {
        this.sendError(clientId, 'MISSING_CHANNEL', 'Channel required for unsubscription', messageId);
        return;
      }
      
      // Remove subscription
      client.subscriptions.delete(data.channel);
      
      const subscribers = this.subscriptions.get(data.channel);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(data.channel);
        }
      }
      
      // Send success response
      this.sendResponse(clientId, messageId, 'unsubscribed', {
        channel: data.channel
      });
      
    } catch (error) {
      console.error(`Unsubscription error for client ${clientId}:`, error);
      this.sendError(clientId, 'UNSUBSCRIPTION_FAILED', 'Unsubscription failed', messageId);
    }
  }
  
  /**
   * Handle place order
   */
  async handlePlaceOrder(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!client.authenticated) {
        this.sendError(clientId, 'NOT_AUTHENTICATED', 'Authentication required', messageId);
        return;
      }
      
      // Validate order data
      const validation = this.validateOrderData(data);
      if (!validation.valid) {
        this.sendError(clientId, 'INVALID_ORDER_DATA', validation.error, messageId);
        return;
      }
      
      // Place order through matching engine
      const orderData = {
        ...data,
        user_id: client.userId,
        source: 'websocket'
      };
      
      const result = await orderMatchingEngine.placeOrder(orderData);
      
      // Send response
      this.sendResponse(clientId, messageId, 'orderPlaced', result);
      
    } catch (error) {
      console.error(`Place order error for client ${clientId}:`, error);
      this.sendError(clientId, 'ORDER_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle cancel order
   */
  async handleCancelOrder(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!client.authenticated) {
        this.sendError(clientId, 'NOT_AUTHENTICATED', 'Authentication required', messageId);
        return;
      }
      
      if (!data.orderId) {
        this.sendError(clientId, 'MISSING_ORDER_ID', 'Order ID required', messageId);
        return;
      }
      
      // Cancel order through matching engine
      const result = await orderMatchingEngine.cancelOrder(data.orderId, client.userId);
      
      // Send response
      this.sendResponse(clientId, messageId, 'orderCancelled', result);
      
    } catch (error) {
      console.error(`Cancel order error for client ${clientId}:`, error);
      this.sendError(clientId, 'CANCEL_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle get order book
   */
  async handleGetOrderBook(clientId, messageId, data) {
    try {
      if (!data.symbol) {
        this.sendError(clientId, 'MISSING_SYMBOL', 'Symbol required', messageId);
        return;
      }
      
      const orderBook = await orderBookManager.getOrderBook(data.symbol, data.depth || 20);
      
      this.sendResponse(clientId, messageId, 'orderBook', {
        symbol: data.symbol,
        ...orderBook
      });
      
    } catch (error) {
      console.error(`Get order book error for client ${clientId}:`, error);
      this.sendError(clientId, 'ORDERBOOK_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle get ticker
   */
  async handleGetTicker(clientId, messageId, data) {
    try {
      let ticker;
      
      if (data.symbol) {
        ticker = await marketDataService.getTicker(data.symbol);
      } else {
        ticker = await marketDataService.getAllTickers();
      }
      
      this.sendResponse(clientId, messageId, 'ticker', ticker);
      
    } catch (error) {
      console.error(`Get ticker error for client ${clientId}:`, error);
      this.sendError(clientId, 'TICKER_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle get candlesticks
   */
  async handleGetCandlesticks(clientId, messageId, data) {
    try {
      if (!data.symbol || !data.interval) {
        this.sendError(clientId, 'MISSING_PARAMS', 'Symbol and interval required', messageId);
        return;
      }
      
      const candlesticks = await marketDataService.getCandlesticks(
        data.symbol,
        data.interval,
        data.limit,
        data.startTime,
        data.endTime
      );
      
      this.sendResponse(clientId, messageId, 'candlesticks', {
        symbol: data.symbol,
        interval: data.interval,
        data: candlesticks
      });
      
    } catch (error) {
      console.error(`Get candlesticks error for client ${clientId}:`, error);
      this.sendError(clientId, 'CANDLESTICKS_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle get orders
   */
  async handleGetOrders(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!client.authenticated) {
        this.sendError(clientId, 'NOT_AUTHENTICATED', 'Authentication required', messageId);
        return;
      }
      
      // This would integrate with order service
      // For now, return mock data
      const orders = [];
      
      this.sendResponse(clientId, messageId, 'orders', {
        orders,
        total: orders.length
      });
      
    } catch (error) {
      console.error(`Get orders error for client ${clientId}:`, error);
      this.sendError(clientId, 'ORDERS_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle get trades
   */
  async handleGetTrades(clientId, messageId, data) {
    try {
      const client = this.clients.get(clientId);
      
      if (!client.authenticated) {
        this.sendError(clientId, 'NOT_AUTHENTICATED', 'Authentication required', messageId);
        return;
      }
      
      // This would integrate with trade service
      // For now, return mock data
      const trades = [];
      
      this.sendResponse(clientId, messageId, 'trades', {
        trades,
        total: trades.length
      });
      
    } catch (error) {
      console.error(`Get trades error for client ${clientId}:`, error);
      this.sendError(clientId, 'TRADES_FAILED', error.message, messageId);
    }
  }
  
  /**
   * Handle disconnection
   */
  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    
    if (client) {
      // Remove from user connections
      if (client.userId) {
        const userConnections = this.userConnections.get(client.userId);
        if (userConnections) {
          userConnections.delete(clientId);
          if (userConnections.size === 0) {
            this.userConnections.delete(client.userId);
          }
        }
      }
      
      // Remove subscriptions
      for (const channel of client.subscriptions) {
        const subscribers = this.subscriptions.get(channel);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.subscriptions.delete(channel);
          }
        }
      }
      
      // Remove client
      this.clients.delete(clientId);
      
      console.log(`Client ${clientId} disconnected (code: ${code}, reason: ${reason})`);
    }
    
    // Clean up rate limit
    this.rateLimits.delete(clientId);
  }
  
  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.handleDisconnection(clientId);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Send message to user (all connections)
   */
  sendToUser(userId, message) {
    const connections = this.userConnections.get(userId);
    
    if (connections) {
      let sent = 0;
      for (const clientId of connections) {
        if (this.sendToClient(clientId, message)) {
          sent++;
        }
      }
      return sent;
    }
    
    return 0;
  }
  
  /**
   * Broadcast to subscribers
   */
  broadcastToSubscribers(channel, message) {
    const subscribers = this.subscriptions.get(channel);
    
    if (subscribers) {
      let sent = 0;
      for (const clientId of subscribers) {
        if (this.sendToClient(clientId, message)) {
          sent++;
        }
      }
      return sent;
    }
    
    return 0;
  }
  
  /**
   * Send response
   */
  sendResponse(clientId, messageId, type, data) {
    this.sendToClient(clientId, {
      id: messageId,
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Send error
   */
  sendError(clientId, code, message, messageId = null) {
    this.sendToClient(clientId, {
      id: messageId,
      type: 'error',
      error: {
        code,
        message
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Send heartbeat
   */
  sendHeartbeat() {
    const now = Date.now();
    const timeout = this.config.heartbeatInterval * 2;
    
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Check if client is still alive
        if (now - client.lastActivity > timeout) {
          console.log(`Client ${clientId} timed out`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
        } else {
          // Send ping
          client.ws.ping();
        }
      } else {
        this.handleDisconnection(clientId);
      }
    }
  }
  
  /**
   * Check rate limit
   */
  checkRateLimit(clientId) {
    const now = Date.now();
    const limit = this.rateLimits.get(clientId) || {
      requests: 0,
      windowStart: now
    };
    
    // Reset window if expired
    if (now - limit.windowStart > this.config.rateLimitWindow) {
      limit.requests = 0;
      limit.windowStart = now;
    }
    
    // Check limit
    if (limit.requests >= this.config.maxRequestsPerWindow) {
      return false;
    }
    
    // Increment counter
    limit.requests++;
    this.rateLimits.set(clientId, limit);
    
    return true;
  }
  
  /**
   * Validate channel format
   */
  isValidChannel(channel) {
    const validPatterns = [
      /^ticker:[A-Z]+$/,
      /^trades:[A-Z]+$/,
      /^orderbook:[A-Z]+$/,
      /^candlesticks:[A-Z]+:(1m|5m|15m|30m|1h|4h|1d|1w)$/
    ];
    
    return validPatterns.some(pattern => pattern.test(channel));
  }
  
  /**
   * Validate order data
   */
  validateOrderData(data) {
    if (!data.symbol) {
      return { valid: false, error: 'Symbol required' };
    }
    
    if (!data.side || !['buy', 'sell'].includes(data.side)) {
      return { valid: false, error: 'Valid side required (buy/sell)' };
    }
    
    if (!data.type || !['market', 'limit', 'stop', 'stop_limit'].includes(data.type)) {
      return { valid: false, error: 'Valid order type required' };
    }
    
    if (!data.quantity || parseFloat(data.quantity) <= 0) {
      return { valid: false, error: 'Valid quantity required' };
    }
    
    if (data.type !== 'market' && (!data.price || parseFloat(data.price) <= 0)) {
      return { valid: false, error: 'Valid price required for non-market orders' };
    }
    
    return { valid: true };
  }
  
  /**
   * Send initial data for subscription
   */
  async sendInitialData(clientId, channel) {
    try {
      const [type, symbol, interval] = channel.split(':');
      
      switch (type) {
        case 'ticker':
          const ticker = await marketDataService.getTicker(symbol);
          if (ticker) {
            this.sendToClient(clientId, {
              type: 'ticker',
              data: ticker
            });
          }
          break;
          
        case 'orderbook':
          const orderBook = await orderBookManager.getOrderBook(symbol, 20);
          if (orderBook) {
            this.sendToClient(clientId, {
              type: 'orderbook',
              data: { symbol, ...orderBook }
            });
          }
          break;
          
        case 'candlesticks':
          if (interval) {
            const candlesticks = await marketDataService.getCandlesticks(symbol, interval, 100);
            if (candlesticks && candlesticks.length > 0) {
              this.sendToClient(clientId, {
                type: 'candlestick',
                data: {
                  symbol,
                  interval,
                  data: candlesticks
                }
              });
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error sending initial data for ${channel}:`, error);
    }
  }
  
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Handle server error
   */
  handleServerError(error) {
    console.error('WebSocket server error:', error);
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      totalSubscriptions: this.subscriptions.size,
      totalUsers: this.userConnections.size,
      uptime: process.uptime()
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }
    
    // Close server
    if (this.wss) {
      this.wss.close();
    }
    
    // Clear maps
    this.clients.clear();
    this.subscriptions.clear();
    this.userConnections.clear();
    this.rateLimits.clear();
    
    console.log('WebSocket service cleaned up');
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;