const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Create test databases if they don't exist
    console.log('📊 Setting up test databases...');
    
    // PostgreSQL test database setup
    try {
      const createDbCmd = `createdb -h localhost -p 5432 -U cex_user cex_test`;
      process.env.PGPASSWORD = 'cex_password_2024';
      execSync(createDbCmd, { stdio: 'ignore' });
      console.log('✅ PostgreSQL test database created');
    } catch (error) {
      // Database might already exist
      console.log('ℹ️  PostgreSQL test database already exists or creation failed');
    }
    
    // MongoDB test database setup
    try {
      // MongoDB databases are created automatically when first accessed
      console.log('✅ MongoDB test database will be created on first access');
    } catch (error) {
      console.log('⚠️  MongoDB setup warning:', error.message);
    }
    
    // Redis test database setup
    try {
      // Redis databases are selected by number, no creation needed
      console.log('✅ Redis test database (DB 1) ready');
    } catch (error) {
      console.log('⚠️  Redis setup warning:', error.message);
    }
    
    // Create test directories
    const testDirs = [
      path.join(__dirname, '../logs/test'),
      path.join(__dirname, '../uploads/test'),
      path.join(__dirname, '../temp/test'),
      path.join(__dirname, '../coverage'),
      path.join(__dirname, '../test-results')
    ];
    
    const fs = require('fs');
    testDirs.forEach(dir => {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created test directory: ${dir}`);
      } catch (error) {
        console.log(`ℹ️  Directory already exists: ${dir}`);
      }
    });
    
    // Set up test-specific configurations
    console.log('⚙️  Configuring test environment...');
    
    // Reduce bcrypt rounds for faster tests
    process.env.BCRYPT_ROUNDS = '1';
    
    // Set shorter timeouts for tests
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '2h';
    
    // Disable external services
    process.env.DISABLE_EXTERNAL_APIS = 'true';
    process.env.DISABLE_EMAIL_SENDING = 'true';
    process.env.DISABLE_SMS_SENDING = 'true';
    process.env.DISABLE_BLOCKCHAIN_CALLS = 'true';
    
    // Enable test-specific features
    process.env.ENABLE_TEST_ROUTES = 'true';
    process.env.ENABLE_DEBUG_LOGGING = 'false';
    
    // Set up mock services
    console.log('🎭 Setting up mock services...');
    
    // Mock external API responses
    global.mockResponses = {
      coinmarketcap: {
        'BTC': { price: 50000, change_24h: 2.5 },
        'ETH': { price: 3000, change_24h: -1.2 },
        'USDT': { price: 1, change_24h: 0.01 }
      },
      binance: {
        'BTCUSDT': { price: '50000.00', volume: '1000.50' },
        'ETHUSDT': { price: '3000.00', volume: '2000.75' }
      },
      blockchain: {
        bitcoin: { blockHeight: 700000, difficulty: 20000000000000 },
        ethereum: { blockNumber: 15000000, gasPrice: '20000000000' }
      }
    };
    
    // Set up test data templates
    global.testDataTemplates = {
      user: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true,
        role: 'user'
      },
      tradingPair: {
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        minOrderSize: '0.001',
        maxOrderSize: '100',
        tickSize: '0.01',
        lotSize: '0.001'
      },
      order: {
        type: 'limit',
        side: 'buy',
        quantity: '1.0',
        price: '50000.00',
        status: 'pending'
      }
    };
    
    // Initialize test counters
    global.testCounters = {
      users: 0,
      orders: 0,
      trades: 0,
      sessions: 0
    };
    
    // Set up test utilities
    global.testUtils = {
      generateUniqueEmail: () => {
        global.testCounters.users++;
        return `test${global.testCounters.users}@example.com`;
      },
      generateUniqueOrderId: () => {
        global.testCounters.orders++;
        return `order_${Date.now()}_${global.testCounters.orders}`;
      },
      sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      randomString: (length = 10) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }
    };
    
    console.log('✅ Global test setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
};