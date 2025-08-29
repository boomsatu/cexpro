const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model SystemConfiguration untuk mengelola konfigurasi sistem yang dapat diubah secara dinamis
 * Mendukung berbagai tipe konfigurasi dengan validasi dan versioning
 */
const SystemConfiguration = sequelize.define('SystemConfiguration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Configuration identification
  config_key: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    comment: 'Unique key for the configuration'
  },
  
  config_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Human-readable name for the configuration'
  },
  
  category: {
    type: DataTypes.ENUM(
      'trading',
      'security',
      'api',
      'wallet',
      'compliance',
      'notification',
      'maintenance',
      'performance',
      'ui',
      'integration',
      'backup',
      'monitoring',
      'general'
    ),
    allowNull: false,
    comment: 'Configuration category'
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Configuration subcategory'
  },
  
  // Value and type
  config_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Configuration value (stored as string)'
  },
  
  value_type: {
    type: DataTypes.ENUM(
      'string',
      'number',
      'boolean',
      'json',
      'array',
      'url',
      'email',
      'password',
      'enum',
      'date',
      'time',
      'datetime'
    ),
    allowNull: false,
    defaultValue: 'string',
    comment: 'Type of the configuration value'
  },
  
  default_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Default value for the configuration'
  },
  
  // Validation rules
  validation_rules: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Validation rules for the configuration value'
  },
  
  allowed_values: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Allowed values for enum type configurations'
  },
  
  min_value: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Minimum value for numeric configurations'
  },
  
  max_value: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Maximum value for numeric configurations'
  },
  
  // Metadata
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this configuration does'
  },
  
  usage_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes on how to use this configuration'
  },
  
  // Access control
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this configuration is publicly readable'
  },
  
  is_editable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this configuration can be edited'
  },
  
  requires_restart: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether changing this config requires system restart'
  },
  
  is_sensitive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this configuration contains sensitive data'
  },
  
  // Environment and scope
  environment: {
    type: DataTypes.ENUM('all', 'production', 'staging', 'development', 'testing'),
    allowNull: false,
    defaultValue: 'all',
    comment: 'Environment where this configuration applies'
  },
  
  scope: {
    type: DataTypes.ENUM('global', 'service', 'user', 'session'),
    allowNull: false,
    defaultValue: 'global',
    comment: 'Scope of the configuration'
  },
  
  service_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Service name for service-scoped configurations'
  },
  
  // Status and lifecycle
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'deprecated', 'testing'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Status of the configuration'
  },
  
  is_system_config: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is a system-level configuration'
  },
  
  // Versioning
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Version number of the configuration'
  },
  
  previous_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Previous value before last change'
  },
  
  change_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for the last change'
  },
  
  // Change tracking
  last_changed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who last changed this configuration'
  },
  
  last_changed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this configuration was last changed'
  },
  
  // Validation and deployment
  is_validated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the current value has been validated'
  },
  
  validation_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Last validation error message'
  },
  
  deployed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this configuration was deployed'
  },
  
  deployed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who deployed this configuration'
  },
  
  // Monitoring and alerts
  monitor_changes: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether to monitor changes to this configuration'
  },
  
  alert_on_change: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether to send alerts when this configuration changes'
  },
  
  alert_recipients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Email addresses to notify on changes'
  },
  
  // Dependencies
  depends_on: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Configuration keys this depends on'
  },
  
  affects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Configuration keys affected by this one'
  },
  
  // Backup and rollback
  backup_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Backup value for rollback purposes'
  },
  
  can_rollback: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this configuration supports rollback'
  },
  
  rollback_window_hours: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 24,
    comment: 'Hours within which rollback is allowed'
  },
  
  // Priority and ordering
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Priority for loading order (lower = higher priority)'
  },
  
  load_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
    comment: 'Order in which to load this configuration'
  },
  
  // Additional metadata
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Tags for categorization and filtering'
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
  tableName: 'system_configurations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['config_key'],
      unique: true
    },
    {
      fields: ['category', 'subcategory']
    },
    {
      fields: ['status', 'environment']
    },
    {
      fields: ['scope', 'service_name']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['is_editable']
    },
    {
      fields: ['requires_restart']
    },
    {
      fields: ['is_sensitive']
    },
    {
      fields: ['last_changed_by']
    },
    {
      fields: ['last_changed_at']
    },
    {
      fields: ['deployed_at']
    },
    {
      fields: ['priority', 'load_order']
    },
    {
      fields: ['monitor_changes']
    },
    {
      fields: ['alert_on_change']
    },
    {
      fields: ['version']
    }
  ],
  validate: {
    valueTypeConsistency() {
      if (this.value_type === 'enum' && (!this.allowed_values || this.allowed_values.length === 0)) {
        throw new Error('Enum type configurations must have allowed_values');
      }
      
      if (this.value_type === 'number' && this.min_value !== null && this.max_value !== null) {
        if (parseFloat(this.min_value) >= parseFloat(this.max_value)) {
          throw new Error('min_value must be less than max_value');
        }
      }
    },
    scopeConsistency() {
      if (this.scope === 'service' && !this.service_name) {
        throw new Error('service_name is required for service-scoped configurations');
      }
    },
    rollbackConsistency() {
      if (this.can_rollback && this.rollback_window_hours <= 0) {
        throw new Error('rollback_window_hours must be positive when rollback is enabled');
      }
    }
  }
});

// Associations
// Associations are defined in models/index.js

// Instance methods
SystemConfiguration.prototype.getParsedValue = function() {
  if (!this.config_value) {
    return this.getDefaultValue();
  }
  
  try {
    switch (this.value_type) {
      case 'boolean':
        return this.config_value.toLowerCase() === 'true';
      case 'number':
        return parseFloat(this.config_value);
      case 'json':
        return JSON.parse(this.config_value);
      case 'array':
        return JSON.parse(this.config_value);
      case 'date':
      case 'datetime':
        return new Date(this.config_value);
      default:
        return this.config_value;
    }
  } catch (error) {
    console.error(`Error parsing config value for ${this.config_key}:`, error);
    return this.getDefaultValue();
  }
};

SystemConfiguration.prototype.getDefaultValue = function() {
  if (!this.default_value) {
    return null;
  }
  
  try {
    switch (this.value_type) {
      case 'boolean':
        return this.default_value.toLowerCase() === 'true';
      case 'number':
        return parseFloat(this.default_value);
      case 'json':
        return JSON.parse(this.default_value);
      case 'array':
        return JSON.parse(this.default_value);
      case 'date':
      case 'datetime':
        return new Date(this.default_value);
      default:
        return this.default_value;
    }
  } catch (error) {
    console.error(`Error parsing default value for ${this.config_key}:`, error);
    return null;
  }
};

SystemConfiguration.prototype.validateValue = function(value) {
  // Type validation
  switch (this.value_type) {
    case 'boolean':
      if (typeof value !== 'boolean' && !['true', 'false'].includes(String(value).toLowerCase())) {
        return { valid: false, error: 'Value must be a boolean' };
      }
      break;
    case 'number':
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Value must be a number' };
      }
      if (this.min_value !== null && numValue < parseFloat(this.min_value)) {
        return { valid: false, error: `Value must be at least ${this.min_value}` };
      }
      if (this.max_value !== null && numValue > parseFloat(this.max_value)) {
        return { valid: false, error: `Value must be at most ${this.max_value}` };
      }
      break;
    case 'enum':
      if (this.allowed_values && !this.allowed_values.includes(String(value))) {
        return { valid: false, error: `Value must be one of: ${this.allowed_values.join(', ')}` };
      }
      break;
    case 'json':
    case 'array':
      try {
        JSON.parse(value);
      } catch (error) {
        return { valid: false, error: 'Value must be valid JSON' };
      }
      break;
    case 'url':
      try {
        new URL(value);
      } catch (error) {
        return { valid: false, error: 'Value must be a valid URL' };
      }
      break;
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Value must be a valid email address' };
      }
      break;
  }
  
  // Custom validation rules
  if (this.validation_rules) {
    // Add custom validation logic here based on validation_rules
  }
  
  return { valid: true };
};

SystemConfiguration.prototype.setValue = async function(newValue, changedBy, reason = null, transaction = null) {
  // Validate the new value
  const validation = this.validateValue(newValue);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }
  
  // Check if configuration is editable
  if (!this.is_editable) {
    throw new Error('This configuration is not editable');
  }
  
  // Store previous value for rollback
  this.previous_value = this.config_value;
  this.backup_value = this.config_value;
  
  // Update the value
  this.config_value = String(newValue);
  this.version += 1;
  this.last_changed_by = changedBy;
  this.last_changed_at = new Date();
  this.change_reason = reason;
  this.is_validated = true;
  this.validation_error = null;
  
  return await this.save({ transaction });
};

SystemConfiguration.prototype.rollback = async function(rolledBackBy, transaction = null) {
  if (!this.can_rollback) {
    throw new Error('Rollback is not allowed for this configuration');
  }
  
  if (!this.backup_value) {
    throw new Error('No backup value available for rollback');
  }
  
  // Check rollback window
  if (this.last_changed_at) {
    const hoursSinceChange = (new Date() - new Date(this.last_changed_at)) / (1000 * 60 * 60);
    if (hoursSinceChange > this.rollback_window_hours) {
      throw new Error(`Rollback window of ${this.rollback_window_hours} hours has expired`);
    }
  }
  
  const currentValue = this.config_value;
  this.config_value = this.backup_value;
  this.previous_value = currentValue;
  this.version += 1;
  this.last_changed_by = rolledBackBy;
  this.last_changed_at = new Date();
  this.change_reason = 'Rollback to previous value';
  
  return await this.save({ transaction });
};

SystemConfiguration.prototype.deploy = async function(deployedBy, transaction = null) {
  this.deployed_at = new Date();
  this.deployed_by = deployedBy;
  
  return await this.save({ transaction });
};

SystemConfiguration.prototype.isDeploymentRequired = function() {
  if (!this.deployed_at) return true;
  if (!this.last_changed_at) return false;
  
  return new Date(this.last_changed_at) > new Date(this.deployed_at);
};

// Static methods
SystemConfiguration.getByKey = async function(configKey, environment = 'all') {
  const where = {
    config_key: configKey,
    status: 'active'
  };
  
  if (environment !== 'all') {
    where[sequelize.Op.or] = [
      { environment: 'all' },
      { environment }
    ];
  }
  
  return await SystemConfiguration.findOne({ where });
};

SystemConfiguration.getValue = async function(configKey, environment = 'all', defaultValue = null) {
  const config = await SystemConfiguration.getByKey(configKey, environment);
  
  if (!config) {
    return defaultValue;
  }
  
  return config.getParsedValue();
};

SystemConfiguration.setValue = async function(configKey, value, changedBy, reason = null, transaction = null) {
  const config = await SystemConfiguration.getByKey(configKey);
  
  if (!config) {
    throw new Error(`Configuration '${configKey}' not found`);
  }
  
  return await config.setValue(value, changedBy, reason, transaction);
};

SystemConfiguration.getByCategory = async function(category, subcategory = null, environment = 'all') {
  const where = {
    category,
    status: 'active'
  };
  
  if (subcategory) {
    where.subcategory = subcategory;
  }
  
  if (environment !== 'all') {
    where[sequelize.Op.or] = [
      { environment: 'all' },
      { environment }
    ];
  }
  
  return await SystemConfiguration.findAll({
    where,
    order: [['priority', 'ASC'], ['load_order', 'ASC']]
  });
};

SystemConfiguration.getPublicConfigs = async function(environment = 'all') {
  const where = {
    is_public: true,
    status: 'active'
  };
  
  if (environment !== 'all') {
    where[sequelize.Op.or] = [
      { environment: 'all' },
      { environment }
    ];
  }
  
  return await SystemConfiguration.findAll({
    where,
    attributes: ['config_key', 'config_name', 'category', 'config_value', 'value_type', 'description'],
    order: [['category', 'ASC'], ['config_name', 'ASC']]
  });
};

SystemConfiguration.getConfigsRequiringRestart = async function() {
  return await SystemConfiguration.findAll({
    where: {
      requires_restart: true,
      status: 'active',
      [sequelize.Op.and]: [
        sequelize.where(
          sequelize.col('last_changed_at'),
          sequelize.Op.gt,
          sequelize.col('deployed_at')
        )
      ]
    },
    include: [
      { model: User, as: 'lastChangedBy' }
    ]
  });
};

SystemConfiguration.getRecentChanges = async function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return await SystemConfiguration.findAll({
    where: {
      last_changed_at: { [sequelize.Op.gte]: since }
    },
    include: [
      { model: User, as: 'lastChangedBy' }
    ],
    order: [['last_changed_at', 'DESC']]
  });
};

SystemConfiguration.bulkUpdate = async function(updates, changedBy, transaction = null) {
  const results = [];
  
  for (const update of updates) {
    try {
      const config = await SystemConfiguration.getByKey(update.config_key);
      if (config) {
        await config.setValue(update.value, changedBy, update.reason, transaction);
        results.push({ config_key: update.config_key, success: true });
      } else {
        results.push({ config_key: update.config_key, success: false, error: 'Configuration not found' });
      }
    } catch (error) {
      results.push({ config_key: update.config_key, success: false, error: error.message });
    }
  }
  
  return results;
};

SystemConfiguration.exportConfigs = async function(category = null, environment = 'all') {
  const where = { status: 'active' };
  
  if (category) {
    where.category = category;
  }
  
  if (environment !== 'all') {
    where[sequelize.Op.or] = [
      { environment: 'all' },
      { environment }
    ];
  }
  
  const configs = await SystemConfiguration.findAll({
    where,
    attributes: {
      exclude: ['id', 'created_at', 'updated_at', 'last_changed_by', 'deployed_by']
    },
    order: [['category', 'ASC'], ['config_key', 'ASC']]
  });
  
  return configs.map(config => config.toJSON());
};

module.exports = SystemConfiguration;