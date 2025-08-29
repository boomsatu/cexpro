const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Cryptocurrency untuk mengelola mata uang kripto
 * Menyimpan informasi tentang cryptocurrency yang didukung di exchange
 */
const Cryptocurrency = sequelize.define('Cryptocurrency', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic cryptocurrency information
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Cryptocurrency symbol (e.g., BTC, ETH, USDT)'
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Short name of the cryptocurrency'
  },
  
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full name of the cryptocurrency'
  },
  
  // Technical specifications
  decimals: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    allowNull: false,
    comment: 'Number of decimal places supported'
  },
  
  contract_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Smart contract address (for tokens)'
  },
  
  blockchain: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Blockchain network (e.g., ethereum, binance-smart-chain)'
  },
  
  // Status flags
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether this cryptocurrency is active for trading'
  },
  
  is_fiat: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this is a fiat currency'
  },
  
  // Transaction limits and fees
  min_deposit: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Minimum deposit amount'
  },
  
  min_withdrawal: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Minimum withdrawal amount'
  },
  
  withdrawal_fee: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Fixed withdrawal fee'
  },
  
  confirmation_blocks: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    allowNull: false,
    comment: 'Required confirmation blocks for deposits'
  },
  
  // URLs and metadata
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to cryptocurrency logo'
  },
  
  website_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Official website URL'
  },
  
  explorer_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Blockchain explorer URL template'
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
  tableName: 'cryptocurrencies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['symbol']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['blockchain']
    },
    {
      fields: ['is_fiat']
    }
  ]
});

// Define associations
Cryptocurrency.associate = function(models) {
  // Association with Balance model
  Cryptocurrency.hasMany(models.Balance, {
    foreignKey: 'currency_id',
    as: 'balances'
  });
  
  // Association with Transaction model
  Cryptocurrency.hasMany(models.Transaction, {
    foreignKey: 'currency_id',
    as: 'transactions'
  });
  
  // Association with Market model (base currency)
  Cryptocurrency.hasMany(models.Market, {
    foreignKey: 'base_currency_id',
    as: 'base_markets'
  });
  
  // Association with Market model (quote currency)
  Cryptocurrency.hasMany(models.Market, {
    foreignKey: 'quote_currency_id',
    as: 'quote_markets'
  });
};

// Static methods
Cryptocurrency.getActiveCurrencies = async function() {
  return await this.findAll({
    where: {
      is_active: true
    },
    order: [['symbol', 'ASC']]
  });
};

Cryptocurrency.getFiatCurrencies = async function() {
  return await this.findAll({
    where: {
      is_fiat: true,
      is_active: true
    },
    order: [['symbol', 'ASC']]
  });
};

Cryptocurrency.getCryptoCurrencies = async function() {
  return await this.findAll({
    where: {
      is_fiat: false,
      is_active: true
    },
    order: [['symbol', 'ASC']]
  });
};

Cryptocurrency.findBySymbol = async function(symbol) {
  return await this.findOne({
    where: {
      symbol: symbol.toUpperCase(),
      is_active: true
    }
  });
};

Cryptocurrency.prototype.getFormattedAmount = function(amount) {
  const decimals = this.decimals || 8;
  return parseFloat(amount).toFixed(decimals);
};

Cryptocurrency.prototype.validateAmount = function(amount) {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, message: 'Amount must be a positive number' };
  }
  
  if (numAmount < parseFloat(this.min_deposit)) {
    return { 
      valid: false, 
      message: `Minimum deposit amount is ${this.min_deposit} ${this.symbol}` 
    };
  }
  
  return { valid: true };
};

Cryptocurrency.prototype.validateWithdrawal = function(amount) {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, message: 'Amount must be a positive number' };
  }
  
  if (numAmount < parseFloat(this.min_withdrawal)) {
    return { 
      valid: false, 
      message: `Minimum withdrawal amount is ${this.min_withdrawal} ${this.symbol}` 
    };
  }
  
  return { valid: true };
};

module.exports = Cryptocurrency;