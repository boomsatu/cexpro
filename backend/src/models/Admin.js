const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

// Admin model definition - extends User functionality for admin-specific features
const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 255]
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 128]
    }
  },

  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'admin'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },

  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_factor_enabled'
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'two_factor_secret'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_until'
  },

}, {
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['last_login']
    }
  ],
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    }
  }
});

// Instance methods
Admin.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

Admin.prototype.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

Admin.prototype.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

Admin.prototype.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockedUntil: null
    });
  }
  
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  
  return this.update(updates);
};

Admin.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockedUntil: null
  });
};

Admin.prototype.hasPermission = function(module, action) {
  if (this.role === 'super_admin') return true;
  
  const permissions = this.permissions || {};
  const modulePermissions = permissions[module];
  
  if (!modulePermissions) return false;
  
  return modulePermissions[action] === true;
};

Admin.prototype.updateLastLogin = async function() {
  return this.update({
    lastLogin: new Date(),
    loginAttempts: 0,
    lockedUntil: null
  });
};

// Static methods
Admin.findByEmail = function(email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

Admin.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

Admin.findByResetToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { [sequelize.Sequelize.Op.gt]: Date.now() }
    }
  });
};

// Define associations
Admin.associate = function(models) {
  // Self-referencing associations for created_by and last_modified_by
  Admin.belongsTo(models.Admin, { 
    foreignKey: 'createdBy', 
    as: 'creator' 
  });
  
  Admin.belongsTo(models.Admin, { 
    foreignKey: 'lastModifiedBy', 
    as: 'lastModifier' 
  });
  
  Admin.hasMany(models.Admin, { 
    foreignKey: 'createdBy', 
    as: 'createdAdmins' 
  });
  
  Admin.hasMany(models.Admin, { 
    foreignKey: 'lastModifiedBy', 
    as: 'modifiedAdmins' 
  });
  
  // Admin activity logs
  if (models.AuditLog) {
    Admin.hasMany(models.AuditLog, { 
      foreignKey: 'admin_id', 
      as: 'auditLogs' 
    });
  }
};

module.exports = Admin;