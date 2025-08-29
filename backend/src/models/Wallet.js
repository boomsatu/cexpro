const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const crypto = require('crypto');

/**
 * Model Wallet untuk mengelola dompet cryptocurrency
 * Mendukung hot, warm, dan cold wallet architecture
 */
const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign key
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who owns this wallet'
  },
  
  // Wallet identification
  wallet_type: {
    type: DataTypes.ENUM('hot', 'warm', 'cold', 'multisig'),
    allowNull: false,
    comment: 'Type of wallet for security classification'
  },
  
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Cryptocurrency symbol (e.g., BTC, ETH, USDT)'
  },
  
  network: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Blockchain network (e.g., mainnet, testnet, polygon)'
  },
  
  // Address information
  address: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Wallet address'
  },
  
  public_key: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Public key (if applicable)'
  },
  
  // HD Wallet information
  derivation_path: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'HD wallet derivation path (e.g., m/44/0/0/0/0)'
  },
  
  address_index: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Address index in HD wallet'
  },
  
  parent_wallet_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'wallets',
      key: 'id'
    },
    comment: 'Parent wallet for HD wallet hierarchy'
  },
  
  // Multi-signature configuration
  multisig_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Multi-signature configuration (m-of-n, signers, etc.)'
  },
  
  required_signatures: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Required signatures for multisig wallet'
  },
  
  total_signers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total number of signers for multisig wallet'
  },
  
  // Wallet status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'frozen', 'compromised', 'deprecated'),
    defaultValue: 'active',
    allowNull: false,
    comment: 'Wallet status'
  },
  
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the primary wallet for the currency'
  },
  
  // Balance tracking
  balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Current wallet balance'
  },
  
  pending_balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Pending balance (unconfirmed transactions)'
  },
  
  last_balance_update: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last balance update timestamp'
  },
  
  // Transaction tracking
  last_transaction_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Last transaction hash'
  },
  
  last_block_height: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Last processed block height'
  },
  
  transaction_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total number of transactions'
  },
  
  // Security features
  encryption_key_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Reference to encryption key for private key storage'
  },
  
  backup_status: {
    type: DataTypes.ENUM('none', 'partial', 'complete'),
    defaultValue: 'none',
    comment: 'Backup status of wallet'
  },
  
  backup_locations: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Backup storage locations'
  },
  
  // Compliance and monitoring
  risk_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: 'Risk score for compliance monitoring'
  },
  
  monitoring_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether monitoring is enabled for this wallet'
  },
  
  alert_thresholds: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Alert thresholds for various metrics'
  },
  
  // Operational limits
  daily_withdrawal_limit: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Daily withdrawal limit'
  },
  
  daily_withdrawal_used: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Daily withdrawal amount used'
  },
  
  last_withdrawal_reset: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last daily withdrawal limit reset'
  },
  
  // Metadata
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Wallet tags for organization'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional wallet metadata'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes about the wallet'
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
  },
  
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time wallet was used for transaction'
  }
}, {
  tableName: 'wallets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['address']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['currency']
    },
    {
      fields: ['network']
    },
    {
      fields: ['wallet_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_primary']
    },
    {
      unique: true,
      fields: ['user_id', 'currency', 'is_primary'],
      where: {
        is_primary: true
      }
    },
    {
      fields: ['parent_wallet_id']
    },
    {
      fields: ['last_balance_update']
    }
  ],
  validate: {
    // Ensure balance is not negative
    positiveBalance() {
      if (parseFloat(this.balance) < 0) {
        throw new Error('Wallet balance cannot be negative');
      }
    },
    
    // Validate multisig configuration
    validMultisig() {
      if (this.wallet_type === 'multisig') {
        if (!this.required_signatures || !this.total_signers) {
          throw new Error('Multisig wallet requires signature configuration');
        }
        if (this.required_signatures > this.total_signers) {
          throw new Error('Required signatures cannot exceed total signers');
        }
      }
    }
  }
});

// Associations are defined in models/index.js

// Instance methods
Wallet.prototype.isActive = function() {
  return this.status === 'active';
};

Wallet.prototype.canWithdraw = function(amount) {
  if (!this.isActive()) return false;
  if (parseFloat(this.balance) < parseFloat(amount)) return false;
  
  // Check daily withdrawal limit
  if (this.daily_withdrawal_limit) {
    const today = new Date().toDateString();
    const lastReset = this.last_withdrawal_reset ? this.last_withdrawal_reset.toDateString() : null;
    
    let dailyUsed = parseFloat(this.daily_withdrawal_used);
    if (lastReset !== today) {
      dailyUsed = 0; // Reset daily usage
    }
    
    if (dailyUsed + parseFloat(amount) > parseFloat(this.daily_withdrawal_limit)) {
      return false;
    }
  }
  
  return true;
};

Wallet.prototype.updateBalance = async function(newBalance, pendingBalance = null) {
  this.balance = newBalance;
  if (pendingBalance !== null) {
    this.pending_balance = pendingBalance;
  }
  this.last_balance_update = new Date();
  
  await this.save();
  return this;
};

Wallet.prototype.addTransaction = async function(txHash, blockHeight = null) {
  this.last_transaction_hash = txHash;
  if (blockHeight) {
    this.last_block_height = blockHeight;
  }
  this.transaction_count += 1;
  this.last_used_at = new Date();
  
  await this.save();
  return this;
};

Wallet.prototype.updateWithdrawalUsage = async function(amount) {
  const today = new Date();
  const lastReset = this.last_withdrawal_reset ? this.last_withdrawal_reset.toDateString() : null;
  
  if (lastReset !== today.toDateString()) {
    // Reset daily usage
    this.daily_withdrawal_used = 0;
    this.last_withdrawal_reset = today;
  }
  
  this.daily_withdrawal_used = parseFloat(this.daily_withdrawal_used) + parseFloat(amount);
  await this.save();
  return this;
};

Wallet.prototype.freeze = async function(reason) {
  this.status = 'frozen';
  this.metadata = {
    ...this.metadata,
    freeze_reason: reason,
    frozen_at: new Date()
  };
  
  await this.save();
  return this;
};

Wallet.prototype.unfreeze = async function() {
  this.status = 'active';
  this.metadata = {
    ...this.metadata,
    unfrozen_at: new Date()
  };
  
  await this.save();
  return this;
};

Wallet.prototype.generateNewAddress = function() {
  // This would integrate with blockchain libraries to generate new addresses
  // For now, return a placeholder
  return {
    address: crypto.randomBytes(20).toString('hex'),
    privateKey: crypto.randomBytes(32).toString('hex'),
    publicKey: crypto.randomBytes(33).toString('hex')
  };
};

// Static methods
Wallet.getUserWallets = async function(userId, currency = null, walletType = null) {
  const where = { user_id: userId };
  
  if (currency) {
    where.currency = currency.toUpperCase();
  }
  
  if (walletType) {
    where.wallet_type = walletType;
  }
  
  return await Wallet.findAll({
    where,
    order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
  });
};

Wallet.getPrimaryWallet = async function(userId, currency) {
  return await Wallet.findOne({
    where: {
      user_id: userId,
      currency: currency.toUpperCase(),
      is_primary: true,
      status: 'active'
    }
  });
};

Wallet.getWalletByAddress = async function(address) {
  return await Wallet.findOne({
    where: { address },
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
    ]
  });
};

Wallet.createWallet = async function(userId, currency, walletType = 'hot', network = 'mainnet', options = {}) {
  const existingPrimary = await Wallet.getPrimaryWallet(userId, currency);
  const isPrimary = !existingPrimary || options.setPrimary;
  
  // Generate address (this would integrate with actual blockchain libraries)
  const addressData = Wallet.prototype.generateNewAddress();
  
  const walletData = {
    user_id: userId,
    currency: currency.toUpperCase(),
    network,
    wallet_type: walletType,
    address: addressData.address,
    public_key: addressData.publicKey,
    is_primary: isPrimary,
    ...options
  };
  
  const wallet = await Wallet.create(walletData);
  
  // If this is set as primary, update other wallets
  if (isPrimary && existingPrimary) {
    await Wallet.update(
      { is_primary: false },
      {
        where: {
          user_id: userId,
          currency: currency.toUpperCase(),
          id: { [sequelize.Op.ne]: wallet.id }
        }
      }
    );
  }
  
  return wallet;
};

Wallet.getHotWallets = async function(currency = null) {
  const where = {
    wallet_type: 'hot',
    status: 'active'
  };
  
  if (currency) {
    where.currency = currency.toUpperCase();
  }
  
  return await Wallet.findAll({
    where,
    order: [['balance', 'DESC']]
  });
};

Wallet.getColdWallets = async function(currency = null) {
  const where = {
    wallet_type: 'cold',
    status: 'active'
  };
  
  if (currency) {
    where.currency = currency.toUpperCase();
  }
  
  return await Wallet.findAll({
    where,
    order: [['balance', 'DESC']]
  });
};

Wallet.getMultisigWallets = async function(userId = null) {
  const where = {
    wallet_type: 'multisig',
    status: 'active'
  };
  
  if (userId) {
    where.user_id = userId;
  }
  
  return await Wallet.findAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] }
    ],
    order: [['created_at', 'DESC']]
  });
};

Wallet.getTotalBalance = async function(currency, walletType = null) {
  const where = {
    currency: currency.toUpperCase(),
    status: 'active'
  };
  
  if (walletType) {
    where.wallet_type = walletType;
  }
  
  const result = await Wallet.findOne({
    where,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('balance')), 'total_balance'],
      [sequelize.fn('SUM', sequelize.col('pending_balance')), 'total_pending']
    ]
  });
  
  return {
    total_balance: result.dataValues.total_balance || 0,
    total_pending: result.dataValues.total_pending || 0
  };
};

// Wallet consolidation for hot wallets
Wallet.consolidateHotWallets = async function(currency, targetWalletId = null) {
  const hotWallets = await Wallet.getHotWallets(currency);
  
  if (hotWallets.length <= 1) {
    return { message: 'No consolidation needed' };
  }
  
  // Find target wallet (highest balance or specified)
  let targetWallet = targetWalletId 
    ? hotWallets.find(w => w.id === targetWalletId)
    : hotWallets.reduce((max, wallet) => 
        parseFloat(wallet.balance) > parseFloat(max.balance) ? wallet : max
      );
  
  if (!targetWallet) {
    throw new Error('Target wallet not found');
  }
  
  const sourceWallets = hotWallets.filter(w => w.id !== targetWallet.id && parseFloat(w.balance) > 0);
  
  // This would integrate with blockchain services to perform actual consolidation
  // For now, we'll return the consolidation plan
  return {
    target_wallet: targetWallet.address,
    source_wallets: sourceWallets.map(w => ({
      address: w.address,
      balance: w.balance
    })),
    total_amount: sourceWallets.reduce((sum, w) => sum + parseFloat(w.balance), 0)
  };
};

module.exports = Wallet;