const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { sequelize } = require('../config/database');

// User model definition
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      isAlphanumeric: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 128]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: true,
    validate: {
      len: [2, 2]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'moderator', 'support'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'banned'),
    defaultValue: 'pending'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  kycLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 3
    }
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  backupCodes: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginIp: {
    type: DataTypes.INET,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      notifications: {
        email: true,
        sms: false,
        push: true,
        trading: true,
        security: true,
        marketing: false
      }
    }
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Enhanced fields
  tradingLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'professional'),
    defaultValue: 'beginner'
  },
  riskTolerance: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  maxDailyTradingVolume: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  maxPositionSize: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  marginTradingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  apiTradingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  referralCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  referredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  totalTradingVolume: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0
  },
  totalTrades: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastTradeAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  vipLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 10
    }
  },
  makerFeeRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.001
  },
  takerFeeRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.001
  }
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft delete
  underscored: true, // Use snake_case for column names
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    },
    {
      fields: ['status']
    },
    {
      fields: ['role']
    },
    {
      fields: ['kyc_level']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

User.prototype.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockUntil: null
    });
  }
  
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  
  return this.update(updates);
};

User.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockUntil: null
  });
};

User.prototype.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

User.prototype.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

User.prototype.setup2FA = function() {
  const secret = speakeasy.generateSecret({
    name: `CEX Exchange (${this.email})`,
    issuer: 'CEX Exchange',
    length: 32
  });
  
  this.twoFactorSecret = secret.base32;
  return secret;
};

User.prototype.verify2FA = function(token) {
  if (!this.twoFactorSecret) {
    return false;
  }
  
  return speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps (60 seconds) of variance
  });
};

User.prototype.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  this.backupCodes = codes;
  return codes;
};

User.prototype.useBackupCode = async function(code) {
  if (!this.backupCodes || !this.backupCodes.includes(code.toUpperCase())) {
    return false;
  }
  
  const updatedCodes = this.backupCodes.filter(c => c !== code.toUpperCase());
  await this.update({ backupCodes: updatedCodes });
  return true;
};

User.prototype.generate2FAQRCode = async function() {
  if (!this.twoFactorSecret) {
    throw new Error('2FA secret not generated');
  }
  
  const otpauthUrl = speakeasy.otpauthURL({
    secret: this.twoFactorSecret,
    label: this.email,
    issuer: 'CEX Exchange',
    encoding: 'base32'
  });
  
  return QRCode.toDataURL(otpauthUrl);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Remove sensitive fields
  delete values.password;
  delete values.twoFactorSecret;
  delete values.backupCodes;
  delete values.passwordResetToken;
  delete values.emailVerificationToken;
  
  return values;
};

// Static methods
User.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { email: identifier },
        { username: identifier }
      ]
    }
  });
};

User.findByPasswordResetToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        [sequelize.Sequelize.Op.gt]: Date.now()
      }
    }
  });
};

User.findByEmailVerificationToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: {
        [sequelize.Sequelize.Op.gt]: Date.now()
      }
    }
  });
};

// Hooks
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

module.exports = User;