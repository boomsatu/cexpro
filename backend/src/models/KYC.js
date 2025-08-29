const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KYC = sequelize.define('KYC', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  document_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'passport, id_card, driver_license, utility_bill'
  },
  document_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'),
    defaultValue: 'PENDING'
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 3
    }
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verified_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'kyc_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['verified_by']
    }
  ]
});

module.exports = KYC;