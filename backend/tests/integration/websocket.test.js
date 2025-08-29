const WebSocket = require('ws');
const { Server } = require('http');
const app = require('../../src/server');
const { User, TradingPair, Order } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('WebSocket Integration Tests', () => {
  let server, wsServer, testUser, tradingPair, accessToken;
  const WS_PORT = 3003;

  beforeAll(async () => {
    // Create HTTP server for WebSocket
    server = new Server(app);
    server.listen(WS_PORT);
    
    // Initialize WebSocket server (assuming it's exported from your WebSocket service)
    const WebSocketService = require('../../src/services/websocketService');
    wsServer = new WebSocketService(server);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Create test user and trading pair
    testUser = await testUtils.createTestUser({
      email: 'wstest@example.com',
      username: 'wstest'
    });
    
    tradingPair = await testUtils.createTestTradingPair({
      symbol: 'BTC/USDT',
      base_currency: 'BTC',
      quote_currency: 'USDT'
    });
    
    accessToken = testUtils.generateTestToken(testUser.id);
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection successfully', (done) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should authenticate WebSocket connection with valid token', (done) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          expect(message.user_id).toBe(testUser.id);
          ws.close();
          done();
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should reject WebSocket connection with invalid token', (done) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: 'invalid-token'
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_error') {
          expect(message.error).toContain('Invalid token');
          ws.close();
          done();
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Market Data Subscription', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        // Authenticate first
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          done();
        }
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should subscribe to ticker updates', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'ticker',
        symbol: 'BTC/USDT'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_success') {
          expect(message.channel).toBe('ticker');
          expect(message.symbol).toBe('BTC/USDT');
          done();
        }
      });
    });

    it('should subscribe to order book updates', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'orderbook',
        symbol: 'BTC/USDT'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_success') {
          expect(message.channel).toBe('orderbook');
          expect(message.symbol).toBe('BTC/USDT');
          done();
        }
      });
    });

    it('should subscribe to trade updates', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'trades',
        symbol: 'BTC/USDT'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_success') {
          expect(message.channel).toBe('trades');
          expect(message.symbol).toBe('BTC/USDT');
          done();
        }
      });
    });

    it('should reject subscription to invalid symbol', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'ticker',
        symbol: 'INVALID/PAIR'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_error') {
          expect(message.error).toContain('Invalid symbol');
          done();
        }
      });
    });
  });

  describe('Order Updates', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          // Subscribe to user orders
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'orders'
          }));
        } else if (message.type === 'subscription_success' && message.channel === 'orders') {
          done();
        }
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should receive order creation updates', (done) => {
      // Create balance for user
      testUtils.createTestBalance(testUser.id, 'USDT', '50000').then(() => {
        // Listen for order updates
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'order_update' && message.event === 'created') {
            expect(message.order.user_id).toBe(testUser.id);
            expect(message.order.symbol).toBe('BTC/USDT');
            expect(message.order.status).toBe('open');
            done();
          }
        });
        
        // Create order via API
        setTimeout(() => {
          Order.create({
            user_id: testUser.id,
            trading_pair_id: tradingPair.id,
            symbol: 'BTC/USDT',
            side: 'buy',
            type: 'limit',
            quantity: '0.1',
            price: '45000',
            status: 'open',
            filled_quantity: '0',
            remaining_quantity: '0.1'
          });
        }, 100);
      });
    });

    it('should receive order cancellation updates', (done) => {
      // Create an order first
      Order.create({
        user_id: testUser.id,
        trading_pair_id: tradingPair.id,
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '0.1',
        price: '45000',
        status: 'open',
        filled_quantity: '0',
        remaining_quantity: '0.1'
      }).then((order) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'order_update' && message.event === 'cancelled') {
            expect(message.order.id).toBe(order.id);
            expect(message.order.status).toBe('cancelled');
            done();
          }
        });
        
        // Cancel order
        setTimeout(() => {
          order.update({ status: 'cancelled' });
        }, 100);
      });
    });
  });

  describe('Balance Updates', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          // Subscribe to balance updates
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'balances'
          }));
        } else if (message.type === 'subscription_success' && message.channel === 'balances') {
          done();
        }
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should receive balance updates', (done) => {
      // Create initial balance
      testUtils.createTestBalance(testUser.id, 'BTC', '1.0').then((balance) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'balance_update') {
            expect(message.balance.user_id).toBe(testUser.id);
            expect(message.balance.currency).toBe('BTC');
            expect(message.balance.available_balance).toBe('1.5');
            done();
          }
        });
        
        // Update balance
        setTimeout(() => {
          balance.update({ 
            available_balance: '1.5',
            total_balance: '1.5'
          });
        }, 100);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce WebSocket rate limiting', (done) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      let messageCount = 0;
      let rateLimited = false;
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Send many messages quickly
          for (let i = 0; i < 100; i++) {
            ws.send(JSON.stringify({
              type: 'ping'
            }));
          }
        } else if (message.type === 'rate_limit_exceeded') {
          rateLimited = true;
          expect(message.error).toContain('rate limit');
          ws.close();
          done();
        } else if (message.type === 'pong') {
          messageCount++;
          // If we get too many responses without rate limiting, fail
          if (messageCount > 50 && !rateLimited) {
            ws.close();
            done(new Error('Rate limiting not enforced'));
          }
        }
      });
      
      // Timeout if rate limiting doesn't kick in
      setTimeout(() => {
        if (!rateLimited) {
          ws.close();
          done(new Error('Rate limiting timeout'));
        }
      }, 5000);
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple concurrent connections', (done) => {
      const connections = [];
      let connectedCount = 0;
      const totalConnections = 5;
      
      for (let i = 0; i < totalConnections; i++) {
        const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        connections.push(ws);
        
        ws.on('open', () => {
          connectedCount++;
          
          if (connectedCount === totalConnections) {
            // All connections established
            expect(connectedCount).toBe(totalConnections);
            
            // Close all connections
            connections.forEach(conn => conn.close());
            done();
          }
        });
        
        ws.on('error', (error) => {
          done(error);
        });
      }
    });

    it('should handle connection cleanup on disconnect', (done) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to a channel
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'ticker',
            symbol: 'BTC/USDT'
          }));
        } else if (message.type === 'subscription_success') {
          // Close connection abruptly
          ws.terminate();
          
          // Wait a bit for cleanup
          setTimeout(() => {
            // Connection should be cleaned up
            // This test verifies that the server doesn't crash
            done();
          }, 1000);
        }
      });
    });
  });

  describe('Message Validation', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          done();
        }
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should reject invalid JSON messages', (done) => {
      ws.send('invalid json');
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.error).toContain('Invalid JSON');
          done();
        }
      });
    });

    it('should reject messages without type', (done) => {
      ws.send(JSON.stringify({
        data: 'test'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.error).toContain('Missing message type');
          done();
        }
      });
    });

    it('should reject unknown message types', (done) => {
      ws.send(JSON.stringify({
        type: 'unknown_type'
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.error).toContain('Unknown message type');
          done();
        }
      });
    });
  });
});