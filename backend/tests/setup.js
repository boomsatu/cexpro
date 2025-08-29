// Mock database modules for testing
jest.mock('../src/models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    truncate: jest.fn().mockResolvedValue(true)
  },
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  TradingPair: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  Order: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  Balance: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  }
}));

jest.mock('../src/config/redis', () => ({
  flushdb: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1)
}));

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    close: jest.fn().mockResolvedValue(true)
  }
}));

// Mock external services
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendVerificationSMS: jest.fn().mockResolvedValue(true)
}));

const { sequelize } = require('../src/models');
const redis = require('../src/config/redis');
const mongoose = require('mongoose');

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use different DB for tests
process.env.POSTGRES_DB = 'cex_test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cex_test';

// Global test setup
beforeAll(async () => {
  // Wait for database connections
  await sequelize.authenticate();
  console.log('PostgreSQL connected for testing');
  
  // Sync database (create tables)
  await sequelize.sync({ force: true });
  console.log('Test database synced');
  
  // Connect to MongoDB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for testing');
  }
  
  // Clear Redis test database
  await redis.flushdb();
  console.log('Redis test database cleared');
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  await sequelize.close();
  await mongoose.connection.close();
  await redis.quit();
  console.log('Test databases disconnected');
});

// Clear data between tests
beforeEach(async () => {
  // Clear Redis cache
  await redis.flushdb();
  
  // Truncate all PostgreSQL tables
  await sequelize.truncate({ cascade: true, restartIdentity: true });
});

// Test utilities
global.testUtils = {
  // Create test user
  createTestUser: async (userData = {}) => {
    const User = require('../src/models/User');
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      kycLevel: 1,
      status: 'active'
    };
    return await User.create({ ...defaultUser, ...userData });
  },
  
  // Create test trading pair
  createTestTradingPair: async (pairData = {}) => {
    const TradingPair = require('../src/models/TradingPair');
    const defaultPair = {
      symbol: 'BTC/USDT',
      base_currency: 'BTC',
      quote_currency: 'USDT',
      status: 'active',
      min_order_size: '0.001',
      max_order_size: '1000',
      tick_size: '0.01',
      lot_size: '0.001',
      maker_fee: '0.001',
      taker_fee: '0.002'
    };
    return await TradingPair.create({ ...defaultPair, ...pairData });
  },
  
  // Create test balance
  createTestBalance: async (userId, currencyId, amount = '10000') => {
    const Balance = require('../src/models/Balance');
    return await Balance.create({
      user_id: userId,
      currency_id: currencyId,
      available_balance: amount,
      locked_balance: '0',
      total_balance: amount
    });
  },
  
  // Generate JWT token for testing
  generateTestToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
};

// Mock external services
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendVerificationSMS: jest.fn().mockResolvedValue(true)
}));

// Increase timeout for integration tests
jest.setTimeout(30000);