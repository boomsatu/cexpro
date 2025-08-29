const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Admin = require('./Admin');
const Cryptocurrency = require('./Cryptocurrency');
const TradingPair = require('./Market');
const Order = require('./Order');
const Trade = require('./Trade');
const Balance = require('./Balance');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const MarketData = require('./MarketData');
const OrderBookSnapshot = require('./OrderBookSnapshot');
const RiskLimit = require('./RiskLimit');
const FeeStructure = require('./FeeStructure');
const IpWhitelist = require('./IpWhitelist');
const SuspiciousActivity = require('./SuspiciousActivity');
const ComplianceReport = require('./ComplianceReport');
const ColdStorageTracking = require('./ColdStorageTracking');
const AuditLog = require('./AuditLog');
const SystemConfiguration = require('./SystemConfiguration');
const KYC = require('./KYC');

// Define all model associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
  User.hasMany(Trade, { foreignKey: 'buyer_id', as: 'buyTrades' });
  User.hasMany(Trade, { foreignKey: 'seller_id', as: 'sellTrades' });
  User.hasMany(Balance, { foreignKey: 'user_id', as: 'balances' });
  User.hasMany(Wallet, { foreignKey: 'user_id', as: 'wallets' });
  User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
  User.hasMany(RiskLimit, { foreignKey: 'user_id', as: 'riskLimits' });
  User.hasMany(FeeStructure, { foreignKey: 'user_id', as: 'feeStructures' });
  User.hasMany(IpWhitelist, { foreignKey: 'user_id', as: 'ipWhitelists' });
  User.hasMany(SuspiciousActivity, { foreignKey: 'user_id', as: 'suspiciousActivities' });
  User.hasMany(ComplianceReport, { foreignKey: 'user_id', as: 'complianceReports' });
  User.hasMany(ColdStorageTracking, { foreignKey: 'created_by', as: 'createdColdStorages' });
  User.hasMany(ColdStorageTracking, { foreignKey: 'managed_by', as: 'managedColdStorages' });
  User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
  User.hasMany(AuditLog, { foreignKey: 'reviewed_by', as: 'reviewedAuditLogs' });
  User.hasMany(SystemConfiguration, { foreignKey: 'last_changed_by', as: 'changedConfigurations' });
  User.hasMany(SystemConfiguration, { foreignKey: 'deployed_by', as: 'deployedConfigurations' });
  User.hasMany(KYC, { foreignKey: 'user_id', as: 'kycDocuments' });
  User.hasMany(KYC, { foreignKey: 'verified_by', as: 'verifiedKycDocuments' });

  // Cryptocurrency associations
  Cryptocurrency.hasMany(Balance, { foreignKey: 'currency_id', as: 'balances' });
  Cryptocurrency.hasMany(Transaction, { foreignKey: 'currency_id', as: 'transactions' });
  Cryptocurrency.hasMany(TradingPair, { foreignKey: 'base_currency_id', as: 'base_markets' });
  Cryptocurrency.hasMany(TradingPair, { foreignKey: 'quote_currency_id', as: 'quote_markets' });

  // TradingPair associations
  TradingPair.belongsTo(Cryptocurrency, { foreignKey: 'base_currency_id', as: 'baseCurrency' });
  TradingPair.belongsTo(Cryptocurrency, { foreignKey: 'quote_currency_id', as: 'quoteCurrency' });
  TradingPair.hasMany(Order, { foreignKey: 'trading_pair_id', as: 'orders' });
  TradingPair.hasMany(Trade, { foreignKey: 'trading_pair_id', as: 'trades' });
  TradingPair.hasMany(MarketData, { foreignKey: 'trading_pair_id', as: 'marketData' });
  TradingPair.hasMany(OrderBookSnapshot, { foreignKey: 'trading_pair_id', as: 'orderBookSnapshots' });
  TradingPair.hasMany(RiskLimit, { foreignKey: 'trading_pair_id', as: 'riskLimits' });
  TradingPair.hasMany(FeeStructure, { foreignKey: 'trading_pair_id', as: 'feeStructures' });

  // Order associations
  Order.belongsTo(User, { foreignKey: 'user_id', as: 'orderUser' });
  Order.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'tradingPair' });
  Order.hasMany(Trade, { foreignKey: 'buyer_order_id', as: 'buyTrades' });
  Order.hasMany(Trade, { foreignKey: 'seller_order_id', as: 'sellTrades' });
  Order.belongsTo(Order, { foreignKey: 'parent_order_id', as: 'parentOrder' });
  Order.hasMany(Order, { foreignKey: 'parent_order_id', as: 'childOrders' });

  // Trade associations
  Trade.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyerUser' });
  Trade.belongsTo(User, { foreignKey: 'seller_id', as: 'sellerUser' });
  Trade.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'tradingPair' });
  Trade.belongsTo(Order, { foreignKey: 'buyer_order_id', as: 'buyerOrder' });
  Trade.belongsTo(Order, { foreignKey: 'seller_order_id', as: 'sellerOrder' });

  // Balance associations
  Balance.belongsTo(User, { foreignKey: 'user_id', as: 'balanceUser' });
  Balance.belongsTo(Cryptocurrency, { foreignKey: 'currency_id', as: 'currency' });

  // Wallet associations
  Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'walletUser' });
  Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });

  // Transaction associations
  Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'transactionUser' });
  Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });
  Transaction.belongsTo(Cryptocurrency, { foreignKey: 'currency_id', as: 'cryptocurrency' });

  // MarketData associations
  MarketData.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'tradingPair' });

  // OrderBookSnapshot associations
  OrderBookSnapshot.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'orderBookTradingPair' });

  // RiskLimit associations
  RiskLimit.belongsTo(User, { foreignKey: 'user_id', as: 'riskUser' });
  RiskLimit.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'tradingPair' });
  RiskLimit.belongsTo(User, { foreignKey: 'override_by', as: 'overrideBy' });

  // FeeStructure associations
  FeeStructure.belongsTo(User, { foreignKey: 'user_id', as: 'feeUser' });
  FeeStructure.belongsTo(TradingPair, { foreignKey: 'trading_pair_id', as: 'feeTradingPair' });

  // IpWhitelist associations
  IpWhitelist.belongsTo(User, { foreignKey: 'user_id', as: 'whitelistUser' });
  IpWhitelist.belongsTo(User, { foreignKey: 'created_by_admin', as: 'createdByAdmin' });

  // SuspiciousActivity associations
  SuspiciousActivity.belongsTo(User, { foreignKey: 'user_id', as: 'suspiciousUser' });
  SuspiciousActivity.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo' });
  SuspiciousActivity.belongsTo(SuspiciousActivity, { foreignKey: 'parent_case_id', as: 'parentCase' });
  SuspiciousActivity.hasMany(SuspiciousActivity, { foreignKey: 'parent_case_id', as: 'childCases' });

  // ComplianceReport associations
  ComplianceReport.belongsTo(User, { foreignKey: 'user_id', as: 'reportUser' });
  ComplianceReport.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
  ComplianceReport.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewedBy' });
  ComplianceReport.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

  // ColdStorageTracking associations
  ColdStorageTracking.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  ColdStorageTracking.belongsTo(User, { foreignKey: 'managed_by', as: 'manager' });

  // AuditLog associations
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'auditUser' });
  AuditLog.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

  // SystemConfiguration associations
  SystemConfiguration.belongsTo(User, { foreignKey: 'last_changed_by', as: 'lastChangedBy' });
  SystemConfiguration.belongsTo(User, { foreignKey: 'deployed_by', as: 'deployedBy' });

  // KYC associations
  KYC.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  KYC.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedBy' });
};

// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Admin,
  Cryptocurrency,
  TradingPair,
  Market: TradingPair, // Alias for TradingPair
  Order,
  Trade,
  Balance,
  Wallet,
  Transaction,
  MarketData,
  OrderBookSnapshot,
  RiskLimit,
  FeeStructure,
  IpWhitelist,
  SuspiciousActivity,
  ComplianceReport,
  ColdStorageTracking,
  AuditLog,
  SystemConfiguration,
  KYC,
  
  // Helper functions
  defineAssociations,
  
  // Sync database
  syncDatabase: async (options = {}) => {
    try {
      console.log('🔄 Syncing database models...');
      
      // Sync all models
      await sequelize.sync(options);
      
      console.log('✅ Database models synced successfully');
      return true;
    } catch (error) {
      console.error('❌ Error syncing database models:', error);
      throw error;
    }
  },
  
  // Test database connection
  testConnection: async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      return true;
    } catch (error) {
      console.error('❌ Unable to connect to database:', error);
      throw error;
    }
  },
  
  // Close database connection
  closeConnection: async () => {
    try {
      await sequelize.close();
      console.log('✅ Database connection closed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
      throw error;
    }
  },
  
  // Get model by name
  getModel: (modelName) => {
    const models = {
      User,
      Admin,
      TradingPair,
      Order,
      Trade,
      Balance,
      Wallet,
      Transaction,
      MarketData,
      OrderBookSnapshot,
      RiskLimit,
      FeeStructure,
      IpWhitelist,
      SuspiciousActivity,
      ComplianceReport,
      ColdStorageTracking,
      AuditLog,
      SystemConfiguration
    };
    
    return models[modelName] || null;
  },
  
  // Get all model names
  getModelNames: () => {
    return [
      'User',
      'Admin',
      'TradingPair',
      'Order',
      'Trade',
      'Balance',
      'Wallet',
      'Transaction',
      'MarketData',
      'OrderBookSnapshot',
      'RiskLimit',
      'FeeStructure',
      'IpWhitelist',
      'SuspiciousActivity',
      'ComplianceReport',
      'ColdStorageTracking',
      'AuditLog',
      'SystemConfiguration'
    ];
  },
  
  // Validate all models
  validateModels: async () => {
    const modelNames = module.exports.getModelNames();
    const results = {};
    
    for (const modelName of modelNames) {
      try {
        const model = module.exports.getModel(modelName);
        if (model) {
          // Test model by describing the table
          await model.describe();
          results[modelName] = { valid: true };
        } else {
          results[modelName] = { valid: false, error: 'Model not found' };
        }
      } catch (error) {
        results[modelName] = { valid: false, error: error.message };
      }
    }
    
    return results;
  },
  
  // Create database tables if they don't exist
  createTables: async (force = false) => {
    try {
      console.log('🔄 Creating database tables...');
      
      const options = { force };
      
      // Create tables in dependency order
      await User.sync(options);
      await Admin.sync(options);
      await TradingPair.sync(options);
      await Order.sync(options);
      await Trade.sync(options);
      await Balance.sync(options);
      await Wallet.sync(options);
      await Transaction.sync(options);
      await MarketData.sync(options);
      await OrderBookSnapshot.sync(options);
      await RiskLimit.sync(options);
      await FeeStructure.sync(options);
      await IpWhitelist.sync(options);
      await SuspiciousActivity.sync(options);
      await ComplianceReport.sync(options);
      await ColdStorageTracking.sync(options);
      await AuditLog.sync(options);
      await SystemConfiguration.sync(options);
      
      console.log('✅ Database tables created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
      throw error;
    }
  },
  
  // Drop all tables
  dropTables: async () => {
    try {
      console.log('🔄 Dropping database tables...');
      
      // Drop tables in reverse dependency order
      await SystemConfiguration.drop({ cascade: true });
      await AuditLog.drop({ cascade: true });
      await ColdStorageTracking.drop({ cascade: true });
      await ComplianceReport.drop({ cascade: true });
      await SuspiciousActivity.drop({ cascade: true });
      await IpWhitelist.drop({ cascade: true });
      await FeeStructure.drop({ cascade: true });
      await RiskLimit.drop({ cascade: true });
      await OrderBookSnapshot.drop({ cascade: true });
      await MarketData.drop({ cascade: true });
      await Transaction.drop({ cascade: true });
      await Wallet.drop({ cascade: true });
      await Balance.drop({ cascade: true });
      await Trade.drop({ cascade: true });
      await Order.drop({ cascade: true });
      await TradingPair.drop({ cascade: true });
      await Admin.drop({ cascade: true });
      await User.drop({ cascade: true });
      
      console.log('✅ Database tables dropped successfully');
      return true;
    } catch (error) {
      console.error('❌ Error dropping database tables:', error);
      throw error;
    }
  }
};

// Log successful initialization
console.log('✅ Models initialized successfully with associations');
console.log(`📊 Total models loaded: ${module.exports.getModelNames().length}`);