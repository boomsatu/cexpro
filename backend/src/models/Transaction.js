const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Wallet = require('./Wallet');
const crypto = require('crypto');

/**
 * Model Transaction untuk mengelola deposit dan withdrawal
 * Mendukung cryptocurrency dan fiat transactions
 */
const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Transaction identification
  tx_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Internal transaction ID'
  },
  
  external_tx_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'External transaction hash/ID from blockchain or payment processor'
  },
  
  // Foreign keys
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who initiated the transaction'
  },
  
  wallet_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'wallets',
      key: 'id'
    },
    comment: 'Associated wallet (for crypto transactions)'
  },
  
  // Transaction details
  type: {
    type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL', 'TRADE', 'FEE', 'BONUS', 'ADJUSTMENT'),
    allowNull: false,
    comment: 'Type of transaction'
  },
  
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Currency symbol (e.g., BTC, ETH, USDT, USD)'
  },
  
  currency_type: {
    type: DataTypes.ENUM('crypto', 'fiat'),
    allowNull: false,
    comment: 'Type of currency'
  },
  
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Transaction amount'
  },
  
  fee: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Transaction fee'
  },
  
  net_amount: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.type === 'deposit') {
        return parseFloat(this.amount) - parseFloat(this.fee);
      } else {
        return parseFloat(this.amount) + parseFloat(this.fee);
      }
    },
    comment: 'Net amount after fees'
  },
  
  // Address information
  from_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Source address (for crypto transactions)'
  },
  
  to_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Destination address (for crypto transactions)'
  },
  
  // Status tracking
  status: {
    type: DataTypes.ENUM(
      'PENDING',
      'PROCESSING', 
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'EXPIRED'
    ),
    defaultValue: 'PENDING',
    allowNull: false,
    comment: 'Transaction status'
  },
  
  // Blockchain specific
  block_height: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Block height where transaction was included'
  },
  
  confirmations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of confirmations'
  },
  
  required_confirmations: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Required confirmations for completion'
  },
  
  gas_price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Gas price (for Ethereum-based transactions)'
  },
  
  gas_used: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Gas used (for Ethereum-based transactions)'
  },
  
  // Payment method (for fiat)
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Payment method (bank_transfer, credit_card, etc.)'
  },
  
  payment_processor: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Payment processor (stripe, paypal, etc.)'
  },
  
  payment_reference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Payment processor reference ID'
  },
  
  // Risk and compliance
  risk_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: 'Risk score for compliance'
  },
  
  aml_status: {
    type: DataTypes.ENUM('pending', 'approved', 'flagged', 'rejected'),
    defaultValue: 'pending',
    comment: 'AML check status'
  },
  
  compliance_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Compliance team notes'
  },
  
  // Processing information
  processed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin user who processed the transaction'
  },
  
  processing_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Processing notes'
  },
  
  // Error handling
  error_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Error code if transaction failed'
  },
  
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if transaction failed'
  },
  
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of retry attempts'
  },
  
  max_retries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    comment: 'Maximum retry attempts'
  },
  
  // Timing
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Transaction expiration time'
  },
  
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When transaction was confirmed'
  },
  
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When transaction was completed'
  },
  
  failed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When transaction failed'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional transaction metadata'
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Transaction tags for categorization'
  },
  
  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  underscored: true, // Use snake_case for column names
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['tx_id']
    },
    {
      fields: ['external_tx_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['wallet_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['currency']
    },
    {
      fields: ['status']
    },
    {
      fields: ['aml_status']
    },
    {
      fields: ['from_address']
    },
    {
      fields: ['to_address']
    },
    {
      fields: ['block_height']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['confirmed_at']
    },
    {
      fields: ['completed_at']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['user_id', 'type', 'status']
    },
    {
      fields: ['currency', 'type', 'status']
    }
  ],
  validate: {
    // Ensure amount is positive
    positiveAmount() {
      if (parseFloat(this.amount) <= 0) {
        throw new Error('Transaction amount must be positive');
      }
    },
    
    // Ensure fee is not negative
    nonNegativeFee() {
      if (parseFloat(this.fee) < 0) {
        throw new Error('Transaction fee cannot be negative');
      }
    }
  }
});

// Associations are defined in models/index.js

// Hooks
Transaction.beforeCreate(async (transaction) => {
  if (!transaction.tx_id) {
    transaction.tx_id = Transaction.generateTxId();
  }
  
  // Set expiration for pending transactions
  if (!transaction.expires_at && transaction.status === 'PENDING') {
    const expirationHours = transaction.type === 'deposit' ? 24 : 1; // 24h for deposits, 1h for withdrawals
    transaction.expires_at = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }
});

// Instance methods
Transaction.prototype.isPending = function() {
  return ['PENDING', 'PROCESSING', 'CONFIRMING'].includes(this.status);
};

Transaction.prototype.isCompleted = function() {
  return this.status === 'COMPLETED';
};

Transaction.prototype.isFailed = function() {
  return ['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(this.status);
};

Transaction.prototype.canRetry = function() {
  return this.isFailed() && this.retry_count < this.max_retries;
};

Transaction.prototype.isExpired = function() {
  return this.expires_at && new Date() > this.expires_at;
};

Transaction.prototype.needsMoreConfirmations = function() {
  return this.confirmations < this.required_confirmations;
};

Transaction.prototype.updateStatus = async function(newStatus, notes = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Update timestamps based on status
  const now = new Date();
  switch (newStatus) {
    case 'CONFIRMED':
      this.confirmed_at = now;
      break;
    case 'COMPLETED':
      this.completed_at = now;
      if (!this.confirmed_at) this.confirmed_at = now;
      break;
    case 'FAILED':
    case 'CANCELLED':
    case 'REJECTED':
      this.failed_at = now;
      break;
  }
  
  // Add status change to metadata
  this.metadata = {
    ...this.metadata,
    status_history: [
      ...(this.metadata?.status_history || []),
      {
        from: oldStatus,
        to: newStatus,
        timestamp: now,
        notes
      }
    ]
  };
  
  await this.save();
  return this;
};

Transaction.prototype.updateConfirmations = async function(confirmations, blockHeight = null) {
  this.confirmations = confirmations;
  
  if (blockHeight) {
    this.block_height = blockHeight;
  }
  
  // Auto-update status based on confirmations
  if (this.status === 'confirming' && confirmations >= this.required_confirmations) {
    await this.updateStatus('confirmed');
  }
  
  await this.save();
  return this;
};

Transaction.prototype.addError = async function(errorCode, errorMessage) {
  this.error_code = errorCode;
  this.error_message = errorMessage;
  this.retry_count += 1;
  
  if (this.retry_count >= this.max_retries) {
    await this.updateStatus('failed', `Max retries exceeded: ${errorMessage}`);
  }
  
  await this.save();
  return this;
};

Transaction.prototype.retry = async function() {
  if (!this.canRetry()) {
    throw new Error('Transaction cannot be retried');
  }
  
  this.status = 'pending';
  this.error_code = null;
  this.error_message = null;
  this.failed_at = null;
  
  await this.save();
  return this;
};

// Static methods
Transaction.generateTxId = function() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `TX${timestamp}${random}`.toUpperCase();
};

Transaction.getUserTransactions = async function(userId, options = {}) {
  const {
    type = null,
    currency = null,
    status = null,
    limit = 50,
    offset = 0,
    startDate = null,
    endDate = null
  } = options;
  
  const where = { user_id: userId };
  
  if (type) where.type = type;
  if (currency) where.currency = currency.toUpperCase();
  if (status) where.status = status;
  
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[sequelize.Op.gte] = startDate;
    if (endDate) where.created_at[sequelize.Op.lte] = endDate;
  }
  
  return await Transaction.findAndCountAll({
    where,
    include: [
      { model: Wallet, as: 'wallet', attributes: ['id', 'address', 'wallet_type'] }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

Transaction.getPendingTransactions = async function(type = null, currency = null) {
  const where = {
    status: ['pending', 'processing', 'confirming']
  };
  
  if (type) where.type = type;
  if (currency) where.currency = currency.toUpperCase();
  
  return await Transaction.findAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
      { model: Wallet, as: 'wallet', attributes: ['id', 'address', 'wallet_type'] }
    ],
    order: [['created_at', 'ASC']]
  });
};

Transaction.getExpiredTransactions = async function() {
  return await Transaction.findAll({
    where: {
      status: ['pending', 'processing'],
      expires_at: {
        [sequelize.Op.lt]: new Date()
      }
    },
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
    ]
  });
};

Transaction.getTransactionByTxId = async function(txId) {
  return await Transaction.findOne({
    where: { tx_id: txId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
      { model: Wallet, as: 'wallet', attributes: ['id', 'address', 'wallet_type'] }
    ]
  });
};

Transaction.getTransactionByExternalId = async function(externalTxId) {
  return await Transaction.findOne({
    where: { external_tx_id: externalTxId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
      { model: Wallet, as: 'wallet', attributes: ['id', 'address', 'wallet_type'] }
    ]
  });
};

Transaction.getTransactionStats = async function(options = {}) {
  const {
    currency = null,
    startDate = null,
    endDate = null,
    groupBy = 'day' // day, week, month
  } = options;
  
  const where = {};
  
  if (currency) where.currency = currency.toUpperCase();
  
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[sequelize.Op.gte] = startDate;
    if (endDate) where.created_at[sequelize.Op.lte] = endDate;
  }
  
  // Get basic stats
  const stats = await Transaction.findAll({
    where,
    attributes: [
      'type',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('SUM', sequelize.col('fee')), 'total_fees']
    ],
    group: ['type', 'status']
  });
  
  return stats;
};

Transaction.createDeposit = async function(userId, currency, amount, walletId, options = {}) {
  const transactionData = {
    user_id: userId,
    wallet_id: walletId,
    type: 'deposit',
    currency: currency.toUpperCase(),
    currency_type: options.currencyType || 'crypto',
    amount,
    fee: options.fee || 0,
    from_address: options.fromAddress,
    to_address: options.toAddress,
    external_tx_id: options.externalTxId,
    required_confirmations: options.requiredConfirmations || 1,
    metadata: options.metadata || {},
    ...options
  };
  
  return await Transaction.create(transactionData);
};

Transaction.createWithdrawal = async function(userId, currency, amount, toAddress, options = {}) {
  const transactionData = {
    user_id: userId,
    wallet_id: options.walletId,
    type: 'withdrawal',
    currency: currency.toUpperCase(),
    currency_type: options.currencyType || 'crypto',
    amount,
    fee: options.fee || 0,
    to_address: toAddress,
    from_address: options.fromAddress,
    payment_method: options.paymentMethod,
    payment_processor: options.paymentProcessor,
    required_confirmations: options.requiredConfirmations || 1,
    metadata: options.metadata || {},
    ...options
  };
  
  return await Transaction.create(transactionData);
};

// Bulk operations
Transaction.expireOldTransactions = async function() {
  const expiredTransactions = await Transaction.getExpiredTransactions();
  
  for (const tx of expiredTransactions) {
    await tx.updateStatus('expired', 'Transaction expired due to timeout');
  }
  
  return expiredTransactions.length;
};

Transaction.retryFailedTransactions = async function(maxRetries = 10) {
  const failedTransactions = await Transaction.findAll({
    where: {
      status: 'failed',
      retry_count: {
        [sequelize.Op.lt]: sequelize.col('max_retries')
      }
    },
    limit: maxRetries,
    order: [['failed_at', 'ASC']]
  });
  
  const retried = [];
  for (const tx of failedTransactions) {
    try {
      await tx.retry();
      retried.push(tx);
    } catch (error) {
      console.error(`Failed to retry transaction ${tx.tx_id}:`, error);
    }
  }
  
  return retried;
};

module.exports = Transaction;