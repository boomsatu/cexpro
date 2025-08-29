const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model ColdStorageTracking untuk melacak dan mengelola penyimpanan dingin cryptocurrency
 * Mencakup wallet management, security protocols, dan audit trails
 */
const ColdStorageTracking = sequelize.define('ColdStorageTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Wallet identification
  wallet_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the cold storage wallet'
  },
  
  wallet_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Human-readable name for the wallet'
  },
  
  wallet_type: {
    type: DataTypes.ENUM(
      'hardware_wallet',
      'paper_wallet',
      'air_gapped_computer',
      'multi_sig_vault',
      'hsm_vault',        // Hardware Security Module
      'offline_storage',
      'bank_vault',
      'other'
    ),
    allowNull: false,
    comment: 'Type of cold storage solution'
  },
  
  // Cryptocurrency details
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Cryptocurrency symbol (BTC, ETH, etc.)'
  },
  
  network: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Blockchain network (mainnet, testnet, etc.)'
  },
  
  // Address information
  public_address: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Public wallet address'
  },
  
  address_type: {
    type: DataTypes.ENUM('legacy', 'segwit', 'native_segwit', 'multi_sig', 'contract'),
    allowNull: true,
    comment: 'Type of address format'
  },
  
  derivation_path: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'HD wallet derivation path'
  },
  
  // Balance tracking
  current_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Current balance in the wallet'
  },
  
  last_balance_update: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When balance was last updated'
  },
  
  balance_source: {
    type: DataTypes.ENUM('blockchain_scan', 'manual_entry', 'api_query', 'transaction_log'),
    allowNull: true,
    comment: 'Source of balance information'
  },
  
  // Security configuration
  multi_sig_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Multi-signature configuration (m-of-n, signers, etc.)'
  },
  
  encryption_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Encryption method used for private keys'
  },
  
  backup_locations: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Physical locations of backups'
  },
  
  // Access control
  custodians: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'List of authorized custodians and their roles'
  },
  
  access_requirements: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Requirements for accessing the wallet (signatures needed, etc.)'
  },
  
  // Physical security
  physical_location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Physical location description (encrypted/coded)'
  },
  
  security_level: {
    type: DataTypes.ENUM('basic', 'enhanced', 'maximum', 'ultra_secure'),
    allowNull: false,
    defaultValue: 'enhanced',
    comment: 'Security level classification'
  },
  
  vault_provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Third-party vault provider (if applicable)'
  },
  
  insurance_coverage: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Insurance coverage amount'
  },
  
  insurance_provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Insurance provider name'
  },
  
  // Status and lifecycle
  status: {
    type: DataTypes.ENUM(
      'active',
      'inactive',
      'compromised',
      'deprecated',
      'migrating',
      'under_maintenance',
      'quarantined'
    ),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Current status of the cold storage'
  },
  
  is_operational: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the wallet is currently operational'
  },
  
  // Audit and compliance
  last_audit_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last security audit'
  },
  
  next_audit_due: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When next audit is due'
  },
  
  audit_frequency: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'semi_annual', 'annual'),
    allowNull: false,
    defaultValue: 'quarterly',
    comment: 'Required audit frequency'
  },
  
  compliance_status: {
    type: DataTypes.ENUM('compliant', 'non_compliant', 'under_review', 'exempt'),
    allowNull: false,
    defaultValue: 'compliant',
    comment: 'Compliance status'
  },
  
  // Transaction limits
  daily_withdrawal_limit: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Daily withdrawal limit'
  },
  
  monthly_withdrawal_limit: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Monthly withdrawal limit'
  },
  
  min_withdrawal_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum withdrawal amount'
  },
  
  // Monitoring and alerts
  monitoring_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether monitoring is enabled'
  },
  
  alert_thresholds: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Alert thresholds for various events'
  },
  
  last_activity_check: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time activity was checked'
  },
  
  // Risk assessment
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Risk score (0-100, higher = more risky)'
  },
  
  risk_factors: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Identified risk factors'
  },
  
  // Operational details
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created this record'
  },
  
  managed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User currently managing this wallet'
  },
  
  // Hardware details
  hardware_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Hardware device information (model, serial, firmware, etc.)'
  },
  
  firmware_version: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Firmware version of hardware wallet'
  },
  
  last_firmware_update: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last firmware update'
  },
  
  // Recovery information
  recovery_method: {
    type: DataTypes.ENUM('seed_phrase', 'private_key', 'keystore_file', 'hardware_backup', 'multi_sig_recovery'),
    allowNull: true,
    comment: 'Primary recovery method'
  },
  
  backup_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether backup has been verified'
  },
  
  last_backup_verification: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last backup verification'
  },
  
  // Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes and comments'
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Tags for categorization'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata'
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
  tableName: 'cold_storage_tracking',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['wallet_id'],
      unique: true
    },
    {
      fields: ['currency', 'status']
    },
    {
      fields: ['public_address']
    },
    {
      fields: ['wallet_type']
    },
    {
      fields: ['security_level']
    },
    {
      fields: ['status', 'is_operational']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['managed_by']
    },
    {
      fields: ['last_audit_date']
    },
    {
      fields: ['next_audit_due']
    },
    {
      fields: ['compliance_status']
    },
    {
      fields: ['risk_score']
    },
    {
      fields: ['current_balance']
    },
    {
      fields: ['last_balance_update']
    }
  ],
  validate: {
    balanceValid() {
      if (parseFloat(this.current_balance) < 0) {
        throw new Error('Balance cannot be negative');
      }
    },
    riskScoreValid() {
      if (this.risk_score < 0 || this.risk_score > 100) {
        throw new Error('Risk score must be between 0 and 100');
      }
    },
    auditDateValid() {
      if (this.last_audit_date && this.next_audit_due) {
        if (this.last_audit_date >= this.next_audit_due) {
          throw new Error('Next audit due date must be after last audit date');
        }
      }
    }
  }
});

// Associations
// Associations are defined in models/index.js

// Instance methods
ColdStorageTracking.prototype.isActive = function() {
  return this.status === 'active' && this.is_operational;
};

ColdStorageTracking.prototype.isAuditOverdue = function() {
  if (!this.next_audit_due) return false;
  return new Date() > this.next_audit_due;
};

ColdStorageTracking.prototype.isHighRisk = function() {
  return this.risk_score >= 70;
};

ColdStorageTracking.prototype.requiresAttention = function() {
  return this.isAuditOverdue() || this.isHighRisk() || !this.backup_verified;
};

ColdStorageTracking.prototype.getBalanceAge = function() {
  if (!this.last_balance_update) return null;
  const now = new Date();
  const lastUpdate = new Date(this.last_balance_update);
  return Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24)); // Days
};

ColdStorageTracking.prototype.updateBalance = async function(newBalance, source = 'manual_entry', transaction = null) {
  this.current_balance = newBalance;
  this.last_balance_update = new Date();
  this.balance_source = source;
  
  return await this.save({ transaction });
};

ColdStorageTracking.prototype.performAudit = async function(auditResults, nextAuditDate = null, transaction = null) {
  this.last_audit_date = new Date();
  
  if (nextAuditDate) {
    this.next_audit_due = nextAuditDate;
  } else {
    // Calculate next audit date based on frequency
    const nextDate = new Date();
    switch (this.audit_frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semi_annual':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    this.next_audit_due = nextDate;
  }
  
  // Update compliance status based on audit results
  this.compliance_status = auditResults.compliant ? 'compliant' : 'non_compliant';
  
  // Update risk score if provided
  if (auditResults.risk_score !== undefined) {
    this.risk_score = auditResults.risk_score;
  }
  
  // Add audit notes
  if (auditResults.notes) {
    const timestamp = new Date().toISOString();
    const auditNote = `[AUDIT ${timestamp}] ${auditResults.notes}`;
    
    if (this.notes) {
      this.notes += '\n\n' + auditNote;
    } else {
      this.notes = auditNote;
    }
  }
  
  return await this.save({ transaction });
};

ColdStorageTracking.prototype.verifyBackup = async function(verificationMethod = 'manual', transaction = null) {
  this.backup_verified = true;
  this.last_backup_verification = new Date();
  
  const verificationNote = `Backup verified via ${verificationMethod} on ${new Date().toISOString()}`;
  
  if (this.notes) {
    this.notes += '\n\n' + verificationNote;
  } else {
    this.notes = verificationNote;
  }
  
  return await this.save({ transaction });
};

ColdStorageTracking.prototype.addCustodian = async function(custodianInfo, transaction = null) {
  if (!this.custodians) {
    this.custodians = [];
  }
  
  this.custodians.push({
    ...custodianInfo,
    added_at: new Date(),
    id: require('crypto').randomUUID()
  });
  
  return await this.save({ transaction });
};

ColdStorageTracking.prototype.updateRiskAssessment = async function(riskFactors, riskScore, transaction = null) {
  this.risk_factors = riskFactors;
  this.risk_score = riskScore;
  
  const assessmentNote = `Risk assessment updated: Score ${riskScore}, Factors: ${riskFactors.join(', ')}`;
  
  if (this.notes) {
    this.notes += '\n\n' + assessmentNote;
  } else {
    this.notes = assessmentNote;
  }
  
  return await this.save({ transaction });
};

// Static methods
ColdStorageTracking.createWallet = async function(walletData, createdBy, transaction = null) {
  // Generate wallet ID if not provided
  if (!walletData.wallet_id) {
    const timestamp = Date.now().toString();
    const currency = walletData.currency.toUpperCase();
    walletData.wallet_id = `COLD_${currency}_${timestamp}`;
  }
  
  walletData.created_by = createdBy;
  
  // Set default next audit date
  if (!walletData.next_audit_due) {
    const nextAudit = new Date();
    switch (walletData.audit_frequency || 'quarterly') {
      case 'monthly':
        nextAudit.setMonth(nextAudit.getMonth() + 1);
        break;
      case 'quarterly':
        nextAudit.setMonth(nextAudit.getMonth() + 3);
        break;
      case 'semi_annual':
        nextAudit.setMonth(nextAudit.getMonth() + 6);
        break;
      case 'annual':
        nextAudit.setFullYear(nextAudit.getFullYear() + 1);
        break;
    }
    walletData.next_audit_due = nextAudit;
  }
  
  return await ColdStorageTracking.create(walletData, { transaction });
};

ColdStorageTracking.getActiveWallets = async function(currency = null) {
  const where = {
    status: 'active',
    is_operational: true
  };
  
  if (currency) {
    where.currency = currency.toUpperCase();
  }
  
  return await ColdStorageTracking.findAll({
    where,
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'manager' }
    ],
    order: [['current_balance', 'DESC']]
  });
};

ColdStorageTracking.getOverdueAudits = async function() {
  const now = new Date();
  
  return await ColdStorageTracking.findAll({
    where: {
      next_audit_due: { [sequelize.Op.lte]: now },
      status: { [sequelize.Op.notIn]: ['deprecated', 'compromised'] }
    },
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'manager' }
    ],
    order: [['next_audit_due', 'ASC']]
  });
};

ColdStorageTracking.getHighRiskWallets = async function(riskThreshold = 70) {
  return await ColdStorageTracking.findAll({
    where: {
      risk_score: { [sequelize.Op.gte]: riskThreshold },
      status: { [sequelize.Op.notIn]: ['deprecated'] }
    },
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'manager' }
    ],
    order: [['risk_score', 'DESC']]
  });
};

ColdStorageTracking.getTotalBalances = async function() {
  const balances = await ColdStorageTracking.findAll({
    where: {
      status: 'active',
      is_operational: true
    },
    attributes: [
      'currency',
      [sequelize.fn('SUM', sequelize.col('current_balance')), 'total_balance'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'wallet_count']
    ],
    group: ['currency'],
    raw: true
  });
  
  return balances;
};

ColdStorageTracking.getWalletsRequiringAttention = async function() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return await ColdStorageTracking.findAll({
    where: {
      [sequelize.Op.or]: [
        { next_audit_due: { [sequelize.Op.lte]: now } },
        { risk_score: { [sequelize.Op.gte]: 70 } },
        { backup_verified: false },
        { last_balance_update: { [sequelize.Op.lte]: thirtyDaysAgo } },
        { compliance_status: 'non_compliant' }
      ],
      status: { [sequelize.Op.notIn]: ['deprecated'] }
    },
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'manager' }
    ],
    order: [['risk_score', 'DESC'], ['next_audit_due', 'ASC']]
  });
};

ColdStorageTracking.getStatistics = async function() {
  const stats = await ColdStorageTracking.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_wallets'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'active\' THEN 1 END')), 'active_wallets'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_operational = true THEN 1 END')), 'operational_wallets'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN risk_score >= 70 THEN 1 END')), 'high_risk_wallets'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN backup_verified = false THEN 1 END')), 'unverified_backups'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN next_audit_due <= NOW() THEN 1 END')), 'overdue_audits'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'avg_risk_score'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN compliance_status = \'compliant\' THEN 1 END')), 'compliant_wallets']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

module.exports = ColdStorageTracking;