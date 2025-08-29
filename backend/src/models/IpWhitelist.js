const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const ipRangeCheck = require('ip-range-check');

/**
 * Model IpWhitelist untuk mengelola daftar IP yang diizinkan
 * Mendukung individual IP, IP ranges, dan CIDR notation
 */
const IpWhitelist = sequelize.define('IpWhitelist', {
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
    comment: 'User who owns this IP whitelist entry'
  },
  
  // IP configuration
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Individual IP address (IPv4 or IPv6)'
  },
  
  ip_range_start: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Start of IP range'
  },
  
  ip_range_end: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'End of IP range'
  },
  
  cidr_notation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'CIDR notation (e.g., 192.168.1.0/24)'
  },
  
  // Entry metadata
  label: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'User-friendly label for this IP entry'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of this IP entry'
  },
  
  // Access control
  permissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: ['login'],
    comment: 'Allowed permissions: login, trading, withdrawal, api_access'
  },
  
  // Status and validation
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this IP entry is active'
  },
  
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this IP has been verified'
  },
  
  verification_method: {
    type: DataTypes.ENUM('email', 'sms', '2fa', 'admin'),
    allowNull: true,
    comment: 'Method used to verify this IP'
  },
  
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this IP was verified'
  },
  
  // Usage tracking
  first_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this IP was first used'
  },
  
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this IP was last used'
  },
  
  usage_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times this IP has been used'
  },
  
  // Geographic information
  country_code: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'ISO country code'
  },
  
  country_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Country name'
  },
  
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City name'
  },
  
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Region/state name'
  },
  
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Timezone'
  },
  
  // ISP information
  isp: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Internet Service Provider'
  },
  
  organization: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Organization name'
  },
  
  // Security flags
  is_vpn: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this IP is from a VPN'
  },
  
  is_proxy: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this IP is from a proxy'
  },
  
  is_tor: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this IP is from Tor network'
  },
  
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Risk score (0-100, higher = more risky)'
  },
  
  // Expiration
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this IP whitelist entry expires'
  },
  
  // Admin controls
  created_by_admin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this entry was created by an admin'
  },
  
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin notes about this IP entry'
  },
  
  // Metadata
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent when this IP was first added'
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
  tableName: 'ip_whitelist',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'is_active']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['cidr_notation']
    },
    {
      fields: ['is_active', 'expires_at']
    },
    {
      fields: ['country_code']
    },
    {
      fields: ['risk_score']
    },
    {
      fields: ['is_vpn', 'is_proxy', 'is_tor']
    },
    {
      fields: ['last_used_at']
    },
    {
      fields: ['verified_at']
    }
  ],
  validate: {
    ipConfigurationValid() {
      const hasIp = !!this.ip_address;
      const hasRange = !!(this.ip_range_start && this.ip_range_end);
      const hasCidr = !!this.cidr_notation;
      
      const configCount = [hasIp, hasRange, hasCidr].filter(Boolean).length;
      
      if (configCount !== 1) {
        throw new Error('Exactly one IP configuration method must be specified');
      }
    },
    permissionsValid() {
      const validPermissions = ['login', 'trading', 'withdrawal', 'api_access', 'admin'];
      const invalidPermissions = this.permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }
    },
    expirationValid() {
      if (this.expires_at && this.expires_at <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
    }
  }
});

// Associations
IpWhitelist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Instance methods
IpWhitelist.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
};

IpWhitelist.prototype.isValidForPermission = function(permission) {
  if (!this.is_active || this.isExpired()) return false;
  return this.permissions.includes(permission);
};

IpWhitelist.prototype.matchesIp = function(ipAddress) {
  if (!this.is_active || this.isExpired()) return false;
  
  try {
    // Direct IP match
    if (this.ip_address) {
      return this.ip_address === ipAddress;
    }
    
    // IP range match
    if (this.ip_range_start && this.ip_range_end) {
      return ipRangeCheck(ipAddress, [this.ip_range_start, this.ip_range_end]);
    }
    
    // CIDR match
    if (this.cidr_notation) {
      return ipRangeCheck(ipAddress, this.cidr_notation);
    }
    
    return false;
  } catch (error) {
    console.error('IP matching error:', error);
    return false;
  }
};

IpWhitelist.prototype.updateUsage = async function(transaction = null) {
  this.usage_count += 1;
  this.last_used_at = new Date();
  
  if (!this.first_used_at) {
    this.first_used_at = new Date();
  }
  
  return await this.save({ transaction });
};

IpWhitelist.prototype.verify = async function(method = 'email', transaction = null) {
  this.is_verified = true;
  this.verification_method = method;
  this.verified_at = new Date();
  
  return await this.save({ transaction });
};

IpWhitelist.prototype.addPermission = async function(permission, transaction = null) {
  if (!this.permissions.includes(permission)) {
    this.permissions = [...this.permissions, permission];
    return await this.save({ transaction });
  }
  return this;
};

IpWhitelist.prototype.removePermission = async function(permission, transaction = null) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return await this.save({ transaction });
};

IpWhitelist.prototype.getDisplayName = function() {
  if (this.label) return this.label;
  if (this.ip_address) return this.ip_address;
  if (this.cidr_notation) return this.cidr_notation;
  if (this.ip_range_start && this.ip_range_end) {
    return `${this.ip_range_start} - ${this.ip_range_end}`;
  }
  return 'Unknown IP';
};

// Static methods
IpWhitelist.checkIpAccess = async function(userId, ipAddress, permission = 'login') {
  const entries = await IpWhitelist.findAll({
    where: {
      user_id: userId,
      is_active: true
    }
  });
  
  // If no whitelist entries, allow access (whitelist is optional)
  if (entries.length === 0) {
    return { allowed: true, reason: 'no_whitelist' };
  }
  
  // Check each entry
  for (const entry of entries) {
    if (entry.matchesIp(ipAddress) && entry.isValidForPermission(permission)) {
      // Update usage
      await entry.updateUsage();
      
      return {
        allowed: true,
        entry: entry,
        reason: 'whitelist_match'
      };
    }
  }
  
  return {
    allowed: false,
    reason: 'ip_not_whitelisted',
    available_entries: entries.length
  };
};

IpWhitelist.addIpForUser = async function(userId, ipConfig, options = {}, transaction = null) {
  const entry = await IpWhitelist.create({
    user_id: userId,
    ip_address: ipConfig.ip_address || null,
    ip_range_start: ipConfig.ip_range_start || null,
    ip_range_end: ipConfig.ip_range_end || null,
    cidr_notation: ipConfig.cidr_notation || null,
    label: options.label || null,
    description: options.description || null,
    permissions: options.permissions || ['login'],
    expires_at: options.expires_at || null,
    country_code: options.country_code || null,
    country_name: options.country_name || null,
    city: options.city || null,
    region: options.region || null,
    timezone: options.timezone || null,
    isp: options.isp || null,
    organization: options.organization || null,
    is_vpn: options.is_vpn || false,
    is_proxy: options.is_proxy || false,
    is_tor: options.is_tor || false,
    risk_score: options.risk_score || 0,
    user_agent: options.user_agent || null,
    created_by_admin: options.created_by_admin || false,
    admin_notes: options.admin_notes || null,
    metadata: options.metadata || null
  }, { transaction });
  
  return entry;
};

IpWhitelist.getUserWhitelist = async function(userId, includeInactive = false) {
  const where = { user_id: userId };
  
  if (!includeInactive) {
    where.is_active = true;
  }
  
  return await IpWhitelist.findAll({
    where,
    order: [['created_at', 'DESC']]
  });
};

IpWhitelist.getExpiredEntries = async function() {
  const now = new Date();
  
  return await IpWhitelist.findAll({
    where: {
      expires_at: { [sequelize.Op.lte]: now },
      is_active: true
    }
  });
};

IpWhitelist.cleanupExpiredEntries = async function() {
  const expiredEntries = await IpWhitelist.getExpiredEntries();
  
  const updatePromises = expiredEntries.map(entry => {
    entry.is_active = false;
    return entry.save();
  });
  
  return await Promise.all(updatePromises);
};

IpWhitelist.getHighRiskIps = async function(riskThreshold = 70) {
  return await IpWhitelist.findAll({
    where: {
      risk_score: { [sequelize.Op.gte]: riskThreshold },
      is_active: true
    },
    include: [{ model: User, as: 'user' }],
    order: [['risk_score', 'DESC']]
  });
};

IpWhitelist.getVpnProxyTorIps = async function() {
  return await IpWhitelist.findAll({
    where: {
      [sequelize.Op.or]: [
        { is_vpn: true },
        { is_proxy: true },
        { is_tor: true }
      ],
      is_active: true
    },
    include: [{ model: User, as: 'user' }]
  });
};

IpWhitelist.getUsageStats = async function(userId = null, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = {
    last_used_at: { [sequelize.Op.gte]: startDate }
  };
  
  if (userId) {
    where.user_id = userId;
  }
  
  const stats = await IpWhitelist.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_entries'],
      [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_usage'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_verified = true THEN 1 END')), 'verified_entries'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_vpn = true OR is_proxy = true OR is_tor = true THEN 1 END')), 'risky_entries'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'avg_risk_score']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

module.exports = IpWhitelist;