const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model AuditLog untuk melacak semua aktivitas dan perubahan dalam sistem
 * Mencakup user actions, system events, dan security incidents
 */
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Event identification
  event_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the event'
  },
  
  event_type: {
    type: DataTypes.ENUM(
      'user_action',
      'system_event',
      'security_event',
      'admin_action',
      'api_call',
      'database_change',
      'authentication',
      'authorization',
      'trading_activity',
      'wallet_operation',
      'compliance_event',
      'error_event',
      'configuration_change',
      'backup_operation',
      'maintenance_event'
    ),
    allowNull: false,
    comment: 'Type of event being logged'
  },
  
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Event category for grouping'
  },
  
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Specific action performed'
  },
  
  // Actor information
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who performed the action (if applicable)'
  },
  
  actor_type: {
    type: DataTypes.ENUM('user', 'system', 'admin', 'api', 'service', 'cron', 'external'),
    allowNull: false,
    comment: 'Type of actor performing the action'
  },
  
  actor_identifier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Additional identifier for the actor (IP, service name, etc.)'
  },
  
  // Target information
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of target object (user, order, wallet, etc.)'
  },
  
  target_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID of the target object'
  },
  
  target_identifier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Additional identifier for the target'
  },
  
  // Event details
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Human-readable description of the event'
  },
  
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Detailed event data and parameters'
  },
  
  // Request information
  request_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Request ID for correlation'
  },
  
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Session ID if applicable'
  },
  
  correlation_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Correlation ID for tracking related events'
  },
  
  // Network information
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'IP address of the actor'
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string'
  },
  
  device_fingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Device fingerprint hash'
  },
  
  // Geographic information
  country: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'Country code (ISO 3166-1 alpha-2)'
  },
  
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Region or state'
  },
  
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City name'
  },
  
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Timezone of the event'
  },
  
  // Status and outcome
  status: {
    type: DataTypes.ENUM('success', 'failure', 'error', 'warning', 'info', 'pending'),
    allowNull: false,
    defaultValue: 'success',
    comment: 'Status of the event'
  },
  
  result: {
    type: DataTypes.ENUM('allowed', 'denied', 'blocked', 'flagged', 'completed', 'failed'),
    allowNull: true,
    comment: 'Result of the action'
  },
  
  error_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Error code if applicable'
  },
  
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if applicable'
  },
  
  // Security and risk
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Risk score for the event (0-100)'
  },
  
  security_flags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Security flags raised by this event'
  },
  
  is_suspicious: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this event is flagged as suspicious'
  },
  
  requires_review: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this event requires manual review'
  },
  
  // Data changes (for database operations)
  before_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Data before the change'
  },
  
  after_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Data after the change'
  },
  
  changed_fields: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'List of fields that were changed'
  },
  
  // Performance metrics
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration of the operation in milliseconds'
  },
  
  response_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Size of the response in bytes'
  },
  
  // Compliance and retention
  retention_period: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2555, // 7 years in days
    comment: 'Retention period in days'
  },
  
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this log entry expires'
  },
  
  is_pii_data: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this log contains PII data'
  },
  
  compliance_tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Compliance-related tags'
  },
  
  // Review and investigation
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who reviewed this event'
  },
  
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this event was reviewed'
  },
  
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes from the review'
  },
  
  investigation_status: {
    type: DataTypes.ENUM('none', 'pending', 'in_progress', 'completed', 'closed'),
    allowNull: false,
    defaultValue: 'none',
    comment: 'Investigation status'
  },
  
  // Additional metadata
  source_system: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Source system that generated this log'
  },
  
  source_version: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Version of the source system'
  },
  
  environment: {
    type: DataTypes.ENUM('production', 'staging', 'development', 'testing'),
    allowNull: false,
    defaultValue: 'production',
    comment: 'Environment where the event occurred'
  },
  
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
  occurred_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the event actually occurred'
  },
  
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
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['event_id'],
      unique: true
    },
    {
      fields: ['event_type', 'occurred_at']
    },
    {
      fields: ['user_id', 'occurred_at']
    },
    {
      fields: ['actor_type', 'occurred_at']
    },
    {
      fields: ['category', 'action']
    },
    {
      fields: ['target_type', 'target_id']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['status', 'occurred_at']
    },
    {
      fields: ['risk_score']
    },
    {
      fields: ['is_suspicious', 'occurred_at']
    },
    {
      fields: ['requires_review', 'investigation_status']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['request_id']
    },
    {
      fields: ['correlation_id']
    },
    {
      fields: ['country', 'occurred_at']
    },
    {
      fields: ['environment', 'occurred_at']
    },
    {
      fields: ['expires_at']
    },
    {
      // Composite index for common queries
      fields: ['event_type', 'user_id', 'occurred_at']
    },
    {
      // Index for security monitoring
      fields: ['is_suspicious', 'risk_score', 'occurred_at']
    }
  ],
  validate: {
    riskScoreValid() {
      if (this.risk_score < 0 || this.risk_score > 100) {
        throw new Error('Risk score must be between 0 and 100');
      }
    },
    expirationValid() {
      if (this.expires_at && this.expires_at <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
    },
    reviewConsistency() {
      if (this.reviewed_by && !this.reviewed_at) {
        throw new Error('Reviewed at date is required when reviewer is specified');
      }
      if (this.reviewed_at && !this.reviewed_by) {
        throw new Error('Reviewer is required when reviewed at date is specified');
      }
    }
  }
});

// Associations are defined in models/index.js

// Instance methods
AuditLog.prototype.isHighRisk = function() {
  return this.risk_score >= 70;
};

AuditLog.prototype.isRecentEvent = function(hoursThreshold = 24) {
  const now = new Date();
  const eventTime = new Date(this.occurred_at);
  const hoursDiff = (now - eventTime) / (1000 * 60 * 60);
  return hoursDiff <= hoursThreshold;
};

AuditLog.prototype.requiresAttention = function() {
  return this.is_suspicious || this.requires_review || this.isHighRisk();
};

AuditLog.prototype.getEventAge = function() {
  const now = new Date();
  const eventTime = new Date(this.occurred_at);
  return Math.floor((now - eventTime) / (1000 * 60 * 60 * 24)); // Days
};

AuditLog.prototype.markAsReviewed = async function(reviewerId, notes = null, transaction = null) {
  this.reviewed_by = reviewerId;
  this.reviewed_at = new Date();
  if (notes) {
    this.review_notes = notes;
  }
  
  // If it was flagged for review, mark investigation as completed
  if (this.requires_review && this.investigation_status === 'pending') {
    this.investigation_status = 'completed';
  }
  
  return await this.save({ transaction });
};

AuditLog.prototype.flagAsSuspicious = async function(reason = null, transaction = null) {
  this.is_suspicious = true;
  this.requires_review = true;
  this.investigation_status = 'pending';
  
  if (reason) {
    if (!this.security_flags) {
      this.security_flags = [];
    }
    this.security_flags.push(reason);
  }
  
  return await this.save({ transaction });
};

AuditLog.prototype.updateInvestigation = async function(status, notes = null, transaction = null) {
  this.investigation_status = status;
  
  if (notes) {
    const timestamp = new Date().toISOString();
    const investigationNote = `[${status.toUpperCase()} ${timestamp}] ${notes}`;
    
    if (this.review_notes) {
      this.review_notes += '\n\n' + investigationNote;
    } else {
      this.review_notes = investigationNote;
    }
  }
  
  return await this.save({ transaction });
};

// Static methods
AuditLog.logEvent = async function(eventData, transaction = null) {
  // Generate event ID if not provided
  if (!eventData.event_id) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    eventData.event_id = `${eventData.event_type}_${timestamp}_${random}`;
  }
  
  // Set expiration date based on retention period
  if (!eventData.expires_at && eventData.retention_period) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + eventData.retention_period);
    eventData.expires_at = expirationDate;
  }
  
  // Auto-flag high-risk events for review
  if (eventData.risk_score >= 80) {
    eventData.requires_review = true;
    eventData.investigation_status = 'pending';
  }
  
  return await AuditLog.create(eventData, { transaction });
};

AuditLog.getEventsByUser = async function(userId, limit = 100, offset = 0) {
  return await AuditLog.findAndCountAll({
    where: { user_id: userId },
    include: [
      { model: User, as: 'user' },
      { model: User, as: 'reviewer' }
    ],
    order: [['occurred_at', 'DESC']],
    limit,
    offset
  });
};

AuditLog.getSuspiciousEvents = async function(limit = 100, offset = 0) {
  return await AuditLog.findAndCountAll({
    where: {
      [sequelize.Op.or]: [
        { is_suspicious: true },
        { risk_score: { [sequelize.Op.gte]: 70 } },
        { requires_review: true }
      ]
    },
    include: [
      { model: User, as: 'user' },
      { model: User, as: 'reviewer' }
    ],
    order: [['risk_score', 'DESC'], ['occurred_at', 'DESC']],
    limit,
    offset
  });
};

AuditLog.getEventsByType = async function(eventType, startDate = null, endDate = null, limit = 100) {
  const where = { event_type: eventType };
  
  if (startDate || endDate) {
    where.occurred_at = {};
    if (startDate) where.occurred_at[sequelize.Op.gte] = startDate;
    if (endDate) where.occurred_at[sequelize.Op.lte] = endDate;
  }
  
  return await AuditLog.findAll({
    where,
    include: [
      { model: User, as: 'user' },
      { model: User, as: 'reviewer' }
    ],
    order: [['occurred_at', 'DESC']],
    limit
  });
};

AuditLog.getFailedEvents = async function(limit = 100, offset = 0) {
  return await AuditLog.findAndCountAll({
    where: {
      [sequelize.Op.or]: [
        { status: 'failure' },
        { status: 'error' },
        { result: 'failed' },
        { result: 'denied' }
      ]
    },
    include: [
      { model: User, as: 'user' }
    ],
    order: [['occurred_at', 'DESC']],
    limit,
    offset
  });
};

AuditLog.getEventsByIP = async function(ipAddress, limit = 100, offset = 0) {
  return await AuditLog.findAndCountAll({
    where: { ip_address: ipAddress },
    include: [
      { model: User, as: 'user' }
    ],
    order: [['occurred_at', 'DESC']],
    limit,
    offset
  });
};

AuditLog.getEventsRequiringReview = async function() {
  return await AuditLog.findAll({
    where: {
      requires_review: true,
      investigation_status: { [sequelize.Op.in]: ['none', 'pending'] }
    },
    include: [
      { model: User, as: 'user' }
    ],
    order: [['risk_score', 'DESC'], ['occurred_at', 'ASC']]
  });
};

AuditLog.getStatistics = async function(startDate = null, endDate = null) {
  const where = {};
  
  if (startDate || endDate) {
    where.occurred_at = {};
    if (startDate) where.occurred_at[sequelize.Op.gte] = startDate;
    if (endDate) where.occurred_at[sequelize.Op.lte] = endDate;
  }
  
  const stats = await AuditLog.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_events'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'success\' THEN 1 END')), 'successful_events'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status IN (\'failure\', \'error\') THEN 1 END')), 'failed_events'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_suspicious = true THEN 1 END')), 'suspicious_events'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN requires_review = true THEN 1 END')), 'events_requiring_review'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN risk_score >= 70 THEN 1 END')), 'high_risk_events'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'avg_risk_score'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT user_id')), 'unique_users'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT ip_address')), 'unique_ips']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

AuditLog.cleanupExpiredLogs = async function(batchSize = 1000) {
  const now = new Date();
  
  const deletedCount = await AuditLog.destroy({
    where: {
      expires_at: { [sequelize.Op.lte]: now }
    },
    limit: batchSize
  });
  
  return deletedCount;
};

AuditLog.getEventsByCorrelation = async function(correlationId) {
  return await AuditLog.findAll({
    where: { correlation_id: correlationId },
    include: [
      { model: User, as: 'user' }
    ],
    order: [['occurred_at', 'ASC']]
  });
};

module.exports = AuditLog;