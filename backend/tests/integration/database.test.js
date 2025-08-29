const { sequelize, User, TradingPair, Order, Trade, Balance, Wallet, Transaction, AuditLog, Cryptocurrency } = require('../../src/models');
const bcrypt = require('bcryptjs');
const Big = require('big.js');

describe('Database Integration Tests', () => {
  describe('Model Creation and Validation', () => {
    describe('User Model', () => {
      it('should create a user with valid data', async () => {
        const userData = {
          username: 'testuser123',
          email: 'test@example.com',
          password: await bcrypt.hash('SecurePassword123!', 12),
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1234567890',
          date_of_birth: '1990-01-01',
          country: 'US',
          kyc_status: 'pending',
          email_verified: false,
          phone_verified: false,
          two_factor_enabled: false,
          status: 'active'
        };

        const user = await User.create(userData);
        
        expect(user.id).toBeDefined();
        expect(user.username).toBe(userData.username);
        expect(user.email).toBe(userData.email);
        expect(user.kyc_status).toBe('pending');
        expect(user.status).toBe('active');
        expect(user.created_at).toBeDefined();
        expect(user.updated_at).toBeDefined();
      });

      it('should reject user with invalid email', async () => {
        const userData = {
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePassword123!',
          first_name: 'Test',
          last_name: 'User'
        };

        await expect(User.create(userData)).rejects.toThrow();
      });

      it('should reject duplicate username', async () => {
        const userData1 = {
          username: 'duplicate',
          email: 'user1@example.com',
          password: 'SecurePassword123!',
          first_name: 'User',
          last_name: 'One'
        };

        const userData2 = {
          username: 'duplicate',
          email: 'user2@example.com',
          password: 'SecurePassword123!',
          first_name: 'User',
          last_name: 'Two'
        };

        await User.create(userData1);
        await expect(User.create(userData2)).rejects.toThrow();
      });

      it('should reject duplicate email', async () => {
        const userData1 = {
          username: 'user1',
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
          first_name: 'User',
          last_name: 'One'
        };

        const userData2 = {
          username: 'user2',
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
          first_name: 'User',
          last_name: 'Two'
        };

        await User.create(userData1);
        await expect(User.create(userData2)).rejects.toThrow();
      });
    });

    describe('TradingPair Model', () => {
      it('should create a trading pair with valid data', async () => {
        // TODO: Replace with actual trading pair data from API
        const pairData = {
          symbol: 'TEST/PAIR',
          base_currency: 'TEST',
          quote_currency: 'PAIR',
          status: 'active',
          min_order_size: '0.001',
          max_order_size: '1000',
          tick_size: '0.01',
          lot_size: '0.001',
          maker_fee: '0.001',
          taker_fee: '0.002',
          price_precision: 2,
          quantity_precision: 8
        };

        const pair = await TradingPair.create(pairData);
        
        expect(pair.id).toBeDefined();
        expect(pair.symbol).toBe(pairData.symbol);
        expect(pair.base_currency).toBe(pairData.base_currency);
        expect(pair.quote_currency).toBe(pairData.quote_currency);
        expect(pair.status).toBe('active');
      });

      it('should reject duplicate symbol', async () => {
        // TODO: Replace with actual trading pair data from API
        const pairData1 = {
          symbol: 'TEST/DUPLICATE',
          base_currency: 'TEST',
          quote_currency: 'DUPLICATE',
          status: 'active'
        };

        const pairData2 = {
          symbol: 'TEST/DUPLICATE',
          base_currency: 'TEST',
          quote_currency: 'DUPLICATE',
          status: 'active'
        };

        await TradingPair.create(pairData1);
        await expect(TradingPair.create(pairData2)).rejects.toThrow();
      });
    });

    describe('Order Model', () => {
      let user, tradingPair;

      beforeEach(async () => {
        user = await testUtils.createTestUser();
        tradingPair = await testUtils.createTestTradingPair();
      });

      it('should create an order with valid data', async () => {
        const orderData = {
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.1',
          price: '45000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        };

        const order = await Order.create(orderData);
        
        expect(order.id).toBeDefined();
        expect(order.user_id).toBe(user.id);
        expect(order.trading_pair_id).toBe(tradingPair.id);
        expect(order.symbol).toBe(orderData.symbol);
        expect(order.side).toBe(orderData.side);
        expect(order.type).toBe(orderData.type);
        expect(order.status).toBe('open');
      });

      it('should validate order side', async () => {
        const orderData = {
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'invalid_side',
          type: 'limit',
          quantity: '0.1',
          price: '45000'
        };

        await expect(Order.create(orderData)).rejects.toThrow();
      });

      it('should validate order type', async () => {
        const orderData = {
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'invalid_type',
          quantity: '0.1',
          price: '45000'
        };

        await expect(Order.create(orderData)).rejects.toThrow();
      });
    });

    describe('Balance Model', () => {
      let user;

      beforeEach(async () => {
        user = await testUtils.createTestUser();
      });

      it('should create a balance with valid data', async () => {
        const balanceData = {
          user_id: user.id,
          currency: 'BTC',
          available_balance: '1.0',
          locked_balance: '0.0',
          total_balance: '1.0'
        };

        const balance = await Balance.create(balanceData);
        
        expect(balance.id).toBeDefined();
        expect(balance.user_id).toBe(user.id);
        expect(balance.currency).toBe('BTC');
        expect(balance.available_balance).toBe('1.0');
        expect(balance.locked_balance).toBe('0.0');
        expect(balance.total_balance).toBe('1.0');
      });

      it('should enforce unique constraint on user_id and currency', async () => {
        const balanceData1 = {
          user_id: user.id,
          currency: 'BTC',
          available_balance: '1.0',
          locked_balance: '0.0',
          total_balance: '1.0'
        };

        const balanceData2 = {
          user_id: user.id,
          currency: 'BTC',
          available_balance: '2.0',
          locked_balance: '0.0',
          total_balance: '2.0'
        };

        await Balance.create(balanceData1);
        await expect(Balance.create(balanceData2)).rejects.toThrow();
      });
    });
  });

  describe('Model Associations', () => {
    let user, tradingPair, order, balance;

    beforeEach(async () => {
      user = await testUtils.createTestUser();
      tradingPair = await testUtils.createTestTradingPair();
      balance = await testUtils.createTestBalance(user.id, 'USDT', '10000');
      
      order = await Order.create({
        user_id: user.id,
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
    });

    it('should load user with orders', async () => {
      const userWithOrders = await User.findByPk(user.id, {
        include: [Order]
      });

      expect(userWithOrders.Orders).toHaveLength(1);
      expect(userWithOrders.Orders[0].id).toBe(order.id);
    });

    it('should load user with balances', async () => {
      const userWithBalances = await User.findByPk(user.id, {
        include: [Balance]
      });

      expect(userWithBalances.Balances).toHaveLength(1);
      expect(userWithBalances.Balances[0].currency_id).toBeDefined();
    });

    it('should load order with user and trading pair', async () => {
      const orderWithAssociations = await Order.findByPk(order.id, {
        include: [User, TradingPair]
      });

      expect(orderWithAssociations.User.id).toBe(user.id);
      expect(orderWithAssociations.TradingPair.id).toBe(tradingPair.id);
    });

    it('should load trading pair with orders', async () => {
      const pairWithOrders = await TradingPair.findByPk(tradingPair.id, {
        include: [Order]
      });

      expect(pairWithOrders.Orders).toHaveLength(1);
      expect(pairWithOrders.Orders[0].id).toBe(order.id);
    });
  });

  describe('Database Transactions', () => {
    let user, tradingPair, usdtCurrencyId;

    beforeEach(async () => {
      user = await testUtils.createTestUser();
      tradingPair = await testUtils.createTestTradingPair();
      // Create USDT cryptocurrency first
      const Cryptocurrency = require('../../src/models/Cryptocurrency');
      const usdtCurrency = await Cryptocurrency.create({
        symbol: 'USDT',
        name: 'Tether USD',
        type: 'stablecoin',
        decimals: 6,
        is_active: true
      });
      usdtCurrencyId = usdtCurrency.id;
      await testUtils.createTestBalance(user.id, usdtCurrency.id, '10000');
    });

    it('should rollback transaction on error', async () => {
      const transaction = await sequelize.transaction();

      try {
        // Create order
        const order = await Order.create({
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.1',
          price: '45000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        }, { transaction });

        // Update balance
        // Get USDT currency ID
        const Cryptocurrency = require('../../src/models/Cryptocurrency');
        const usdtCurrency = await Cryptocurrency.findOne({ where: { symbol: 'USDT' } });
        
        await Balance.update(
          { locked_balance: '4500' },
          { 
            where: { user_id: user.id, currency_id: usdtCurrency.id },
            transaction 
          }
        );

        // Simulate error
        throw new Error('Simulated error');
      } catch (error) {
        await transaction.rollback();
      }

      // Verify rollback
      const orders = await Order.findAll({ where: { user_id: user.id } });
      const balance = await Balance.findOne({ where: { user_id: user.id, currency_id: usdtCurrencyId } });
      
      expect(orders).toHaveLength(0);
      expect(balance.locked_balance).toBe('0');
    });

    it('should commit transaction successfully', async () => {
      const transaction = await sequelize.transaction();

      try {
        // Create order
        const order = await Order.create({
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: '0.1',
          price: '45000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        }, { transaction });

        // Update balance
        await Balance.update(
          { locked_balance: '4500' },
          { 
            where: { user_id: user.id, currency_id: usdtCurrencyId },
            transaction 
          }
        );

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      // Verify commit
      const orders = await Order.findAll({ where: { user_id: user.id } });
      const balance = await Balance.findOne({ where: { user_id: user.id, currency_id: usdtCurrencyId } });
      
      expect(orders).toHaveLength(1);
      expect(balance.locked_balance).toBe('4500');
    });
  });

  describe('Complex Queries', () => {
    let users, tradingPairs, orders;

    beforeEach(async () => {
      // Create test data
      users = await Promise.all([
        testUtils.createTestUser({ username: 'user1', email: 'user1@example.com' }),
        testUtils.createTestUser({ username: 'user2', email: 'user2@example.com' }),
        testUtils.createTestUser({ username: 'user3', email: 'user3@example.com' })
      ]);

      tradingPairs = await Promise.all([
        testUtils.createTestTradingPair({ symbol: 'BTC/USDT', base_currency: 'BTC', quote_currency: 'USDT' }),
        testUtils.createTestTradingPair({ symbol: 'ETH/USDT', base_currency: 'ETH', quote_currency: 'USDT' })
      ]);

      // Create orders
      orders = await Order.bulkCreate([
        {
          user_id: users[0].id,
          trading_pair_id: tradingPairs[0].id,
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
          user_id: users[0].id,
          trading_pair_id: tradingPairs[1].id,
          symbol: 'ETH/USDT',
          side: 'sell',
          type: 'limit',
          quantity: '1.0',
          price: '3000',
          status: 'filled',
          filled_quantity: '1.0',
          remaining_quantity: '0'
        },
        {
          user_id: users[1].id,
          trading_pair_id: tradingPairs[0].id,
          symbol: 'BTC/USDT',
          side: 'sell',
          type: 'limit',
          quantity: '0.05',
          price: '46000',
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.05'
        }
      ]);
    });

    it('should find orders by multiple criteria', async () => {
      const openBTCOrders = await Order.findAll({
        where: {
          symbol: 'BTC/USDT',
          status: 'open'
        },
        include: [User, TradingPair]
      });

      expect(openBTCOrders).toHaveLength(2);
      openBTCOrders.forEach(order => {
        expect(order.symbol).toBe('BTC/USDT');
        expect(order.status).toBe('open');
        expect(order.User).toBeDefined();
        expect(order.TradingPair).toBeDefined();
      });
    });

    it('should aggregate order data', async () => {
      const orderStats = await Order.findAll({
        attributes: [
          'symbol',
          [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
          [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
          [sequelize.fn('AVG', sequelize.col('price')), 'avg_price']
        ],
        group: ['symbol']
      });

      expect(orderStats).toHaveLength(2);
      
      const btcStats = orderStats.find(stat => stat.symbol === 'BTC/USDT');
      const ethStats = orderStats.find(stat => stat.symbol === 'ETH/USDT');
      
      expect(btcStats.dataValues.order_count).toBe('2');
      expect(ethStats.dataValues.order_count).toBe('1');
    });

    it('should perform complex joins', async () => {
      const usersWithOrderStats = await User.findAll({
        attributes: [
          'id',
          'username',
          [sequelize.fn('COUNT', sequelize.col('Orders.id')), 'order_count'],
          [sequelize.fn('SUM', sequelize.col('Orders.quantity')), 'total_quantity']
        ],
        include: [{
          model: Order,
          attributes: []
        }],
        group: ['User.id'],
        having: sequelize.where(sequelize.fn('COUNT', sequelize.col('Orders.id')), '>', 0)
      });

      expect(usersWithOrderStats).toHaveLength(2);
      usersWithOrderStats.forEach(user => {
        expect(parseInt(user.dataValues.order_count)).toBeGreaterThan(0);
      });
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 1000 users
      const userData = [];
      for (let i = 0; i < 1000; i++) {
        userData.push({
          username: `bulkuser${i}`,
          email: `bulkuser${i}@example.com`,
          password: 'TestPassword123!',
          first_name: 'Bulk',
          last_name: 'User',
          kyc_status: 'pending',
          status: 'active'
        });
      }
      
      await User.bulkCreate(userData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all users were created
      const userCount = await User.count({
        where: {
          username: {
            [sequelize.Op.like]: 'bulkuser%'
          }
        }
      });
      
      expect(userCount).toBe(1000);
    });

    it('should use indexes effectively', async () => {
      // Create test data
      const user = await testUtils.createTestUser();
      const tradingPair = await testUtils.createTestTradingPair();
      
      // Create many orders
      const orderData = [];
      for (let i = 0; i < 100; i++) {
        orderData.push({
          user_id: user.id,
          trading_pair_id: tradingPair.id,
          symbol: 'BTC/USDT',
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'limit',
          quantity: '0.1',
          price: (45000 + i).toString(),
          status: 'open',
          filled_quantity: '0',
          remaining_quantity: '0.1'
        });
      }
      
      await Order.bulkCreate(orderData);
      
      const startTime = Date.now();
      
      // Query that should use indexes
      const orders = await Order.findAll({
        where: {
          user_id: user.id,
          symbol: 'BTC/USDT',
          status: 'open'
        },
        limit: 10
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(orders).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be very fast with proper indexes
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      const user = await testUtils.createTestUser();
      const tradingPair = await testUtils.createTestTradingPair();
      
      const order = await Order.create({
        user_id: user.id,
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
      
      // Try to delete user with existing orders (should fail)
      await expect(User.destroy({ where: { id: user.id } })).rejects.toThrow();
      
      // Delete order first, then user should work
      await Order.destroy({ where: { id: order.id } });
      await User.destroy({ where: { id: user.id } });
      
      const deletedUser = await User.findByPk(user.id);
      expect(deletedUser).toBeNull();
    });
  });
});