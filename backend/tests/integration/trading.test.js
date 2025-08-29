const request = require('supertest');
const app = require('../../src/server');
const { User, TradingPair, Order, Balance, Trade } = require('../../src/models');
const Big = require('big.js');

describe('Trading API Integration Tests', () => {
  let testUser, testUser2, tradingPair, accessToken, accessToken2;

  beforeEach(async () => {
    // Create test users
    testUser = await testUtils.createTestUser({
      email: 'trader1@example.com',
      username: 'trader1'
    });
    testUser2 = await testUtils.createTestUser({
      email: 'trader2@example.com',
      username: 'trader2'
    });

    // Create trading pair
    // TODO: Replace with actual trading pair data from API
    tradingPair = await testUtils.createTestTradingPair({
      symbol: 'TEST/PAIR',
      base_currency: 'TEST',
      quote_currency: 'PAIR',
      min_order_size: '0.001',
      max_order_size: '100',
      tick_size: '0.01',
      lot_size: '0.001'
    });

    // Create balances
    // TODO: Replace with actual currency data from API
    await testUtils.createTestBalance(testUser.id, 'PAIR', '50000');
    await testUtils.createTestBalance(testUser.id, 'TEST', '1.0');
    await testUtils.createTestBalance(testUser2.id, 'PAIR', '50000');
    await testUtils.createTestBalance(testUser2.id, 'TEST', '1.0');

    // Generate tokens
    accessToken = testUtils.generateTestToken(testUser.id);
    accessToken2 = testUtils.generateTestToken(testUser2.id);
  });

  describe('POST /api/trading/orders', () => {
    it('should create a buy limit order successfully', async () => {
      const orderData = {
        symbol: 'TEST/PAIR',
        side: 'buy',
        type: 'limit',
        quantity: '0.1',
        price: '45000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.symbol).toBe(orderData.symbol);
      expect(response.body.data.order.side).toBe(orderData.side);
      expect(response.body.data.order.type).toBe(orderData.type);
      expect(response.body.data.order.quantity).toBe(orderData.quantity);
      expect(response.body.data.order.price).toBe(orderData.price);
      expect(response.body.data.order.status).toBe('open');

      // Verify order was created in database
      const order = await Order.findByPk(response.body.data.order.id);
      expect(order).toBeTruthy();
      expect(order.user_id).toBe(testUser.id);

      // Verify balance was locked
      const balance = await Balance.findOne({
        where: { user_id: testUser.id, currency: 'PAIR' }
      });
      const expectedLocked = Big(orderData.quantity).times(orderData.price).toString();
      expect(balance.locked_balance).toBe(expectedLocked);
    });

    it('should create a sell limit order successfully', async () => {
      const orderData = {
        symbol: 'TEST/PAIR',
        side: 'sell',
        type: 'limit',
        quantity: '0.05',
        price: '46000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.side).toBe('sell');

      // Verify TEST balance was locked
      const balance = await Balance.findOne({
        where: { user_id: testUser.id, currency: 'TEST' }
      });
      expect(balance.locked_balance).toBe(orderData.quantity);
    });

    it('should create a market buy order successfully', async () => {
      // First create a sell order to match against
      await Order.create({
        user_id: testUser2.id,
        trading_pair_id: tradingPair.id,
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'limit',
        quantity: '0.1',
        price: '45000',
        status: 'open',
        filled_quantity: '0',
        remaining_quantity: '0.1'
      });

      const orderData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        quantity: '0.05'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.type).toBe('market');
    });

    it('should reject order with insufficient balance', async () => {
      const orderData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '10', // Requires 450,000 USDT but user only has 50,000
        price: '45000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient balance');
    });

    it('should reject order below minimum size', async () => {
      const orderData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '0.0005', // Below min_order_size of 0.001
        price: '45000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('minimum order size');
    });

    it('should reject order above maximum size', async () => {
      const orderData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '150', // Above max_order_size of 100
        price: '45000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('maximum order size');
    });

    it('should reject order for inactive trading pair', async () => {
      // Create inactive trading pair
      const inactivePair = await testUtils.createTestTradingPair({
        symbol: 'ETH/USDT',
        base_currency: 'ETH',
        quote_currency: 'USDT',
        status: 'inactive'
      });

      const orderData = {
        symbol: 'ETH/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '1',
        price: '3000'
      };

      const response = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not available for trading');
    });
  });

  describe('GET /api/trading/orders', () => {
    beforeEach(async () => {
      // Create test orders
      await Order.bulkCreate([
        {
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
        },
        {
          user_id: testUser.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'sell',
          type: 'limit',
          quantity: '0.05',
          price: '46000',
          status: 'filled',
          filled_quantity: '0.05',
          remaining_quantity: '0'
        },
        {
          user_id: testUser2.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.2',
          price: '44000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.2'
        }
      ]);
    });

    it('should get user orders successfully', async () => {
      const response = await request(app)
        .get('/api/trading/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.orders[0].user_id).toBe(testUser.id);
      expect(response.body.data.orders[1].user_id).toBe(testUser.id);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/trading/orders?status=open')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].status).toBe('open');
    });

    it('should filter orders by symbol', async () => {
      const response = await request(app)
        .get('/api/trading/orders?symbol=BTC/USDT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      response.body.data.orders.forEach(order => {
        expect(order.symbol).toBe('BTC/USDT');
      });
    });
  });

  describe('DELETE /api/trading/orders/:orderId', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
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

      // Lock balance for the order
      await Balance.update(
        { locked_balance: '4500' },
        { where: { user_id: testUser.id, currency: 'USDT' } }
      );
    });

    it('should cancel order successfully', async () => {
      const response = await request(app)
        .delete(`/api/trading/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');

      // Verify order status updated
      await testOrder.reload();
      expect(testOrder.status).toBe('cancelled');

      // Verify balance unlocked
      const balance = await Balance.findOne({
        where: { user_id: testUser.id, currency: 'USDT' }
      });
      expect(balance.locked_balance).toBe('0');
    });

    it('should reject cancelling filled order', async () => {
      await testOrder.update({ status: 'filled' });

      const response = await request(app)
        .delete(`/api/trading/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be cancelled');
    });

    it('should reject cancelling other user order', async () => {
      const response = await request(app)
        .delete(`/api/trading/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });
  });

  describe('GET /api/trading/balances', () => {
    it('should get user balances successfully', async () => {
      const response = await request(app)
        .get('/api/trading/balances')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balances).toHaveLength(2);
      
      const usdtBalance = response.body.data.balances.find(b => b.currency === 'USDT');
      const btcBalance = response.body.data.balances.find(b => b.currency === 'BTC');
      
      expect(usdtBalance.available_balance).toBe('50000');
      expect(btcBalance.available_balance).toBe('1.0');
    });

    it('should filter balances by currency', async () => {
      const response = await request(app)
        .get('/api/trading/balances?currency=BTC')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balances).toHaveLength(1);
      expect(response.body.data.balances[0].currency).toBe('BTC');
    });
  });

  describe('GET /api/trading/trades', () => {
    beforeEach(async () => {
      // Create test trades
      await Trade.bulkCreate([
        {
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          buyer_id: testUser.id,
          seller_id: testUser2.id,
          quantity: '0.1',
          price: '45000',
          total: '4500',
          buyer_fee: '4.5',
          seller_fee: '9',
          trade_type: 'spot'
        },
        {
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          buyer_id: testUser2.id,
          seller_id: testUser.id,
          quantity: '0.05',
          price: '46000',
          total: '2300',
          buyer_fee: '2.3',
          seller_fee: '4.6',
          trade_type: 'spot'
        }
      ]);
    });

    it('should get user trades successfully', async () => {
      const response = await request(app)
        .get('/api/trading/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(2);
    });

    it('should filter trades by symbol', async () => {
      const response = await request(app)
        .get('/api/trading/trades?symbol=BTC/USDT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(2);
      response.body.data.trades.forEach(trade => {
        expect(trade.symbol).toBe('BTC/USDT');
      });
    });
  });

  describe('GET /api/trading/orderbook/:symbol', () => {
    beforeEach(async () => {
      // Create orders for order book
      await Order.bulkCreate([
        {
          user_id: testUser.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.1',
          price: '44000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        },
        {
          user_id: testUser.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.2',
          price: '43000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.2'
        },
        {
          user_id: testUser2.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'sell',
          type: 'limit',
          quantity: '0.15',
          price: '46000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.15'
        },
        {
          user_id: testUser2.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'sell',
          type: 'limit',
          quantity: '0.1',
          price: '47000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        }
      ]);
    });

    it('should get order book successfully', async () => {
      const response = await request(app)
        .get('/api/trading/orderbook/BTC/USDT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('BTC/USDT');
      expect(response.body.data.bids).toHaveLength(2);
      expect(response.body.data.asks).toHaveLength(2);
      
      // Verify bids are sorted by price descending
      expect(parseFloat(response.body.data.bids[0].price)).toBeGreaterThan(
        parseFloat(response.body.data.bids[1].price)
      );
      
      // Verify asks are sorted by price ascending
      expect(parseFloat(response.body.data.asks[0].price)).toBeLessThan(
        parseFloat(response.body.data.asks[1].price)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on order creation', async () => {
      const orderData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: '0.001',
        price: '45000'
      };

      // Make multiple order requests quickly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/trading/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(orderData)
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/trading/balances')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/trading/balances')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });
});