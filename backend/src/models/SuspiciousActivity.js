const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model SuspiciousActivity untuk melacak dan menganalisis aktivitas mencurigakan
 * Digunakan untuk fraud detection, AML compliance, dan security monitoring
 */
const SuspiciousActivity = sequelize.define('SuspiciousActivity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Foreign key
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User associated with the activity (null for anonymous)'
  },
  
  // Activity identification
  activity_type: {
    type: DataTypes.ENUM(
      'login_anomaly',
      'trading_pattern',
      'withdrawal_pattern',
      'deposit_pattern',
      'ip_anomaly',
      'device_anomaly',
      'velocity_check',
      'amount_anomaly',
      'time_anomaly',
      'geographic_anomaly',
      'api_abuse',
      'account_takeover',
      'money_laundering',
      'market_manipulation',
      'wash_trading',
      'pump_dump',
      'insider_trading',
      'kyc_fraud',
      'identity_theft',
      'multiple_accounts',
      'bot_activity',
      'ddos_attempt',
      'brute_force',
      'social_engineering',
      'phishing_attempt',
      'other'
    ),
    allowNull: false,
    comment: 'Type of suspicious activity detected'
  },
  
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'Severity level of the suspicious activity'
  },
  
  confidence_score: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    comment: 'Confidence score (0.0000 to 1.0000)'
  },
  
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Risk score (0-100, higher = more risky)'
  },
  
  // Activity details
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Brief title describing the activity'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed description of the suspicious activity'
  },
  
  // Context information
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address associated with the activity'
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
  
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Session ID when activity occurred'
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
  
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Timezone'
  },
  
  // Financial details
  amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Amount involved in the activity'
  },
  
  currency: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Currency of the amount'
  },
  
  transaction_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Related transaction ID'
  },
  
  order_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Related order ID'
  },
  
  // Pattern analysis
  pattern_indicators: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Specific pattern indicators that triggered the alert'
  },
  
  anomaly_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Details about the anomaly detected'
  },
  
  baseline_comparison: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Comparison with user baseline behavior'
  },
  
  // Detection information
  detection_method: {
    type: DataTypes.ENUM('rule_based', 'ml_model', 'statistical', 'manual', 'external_feed'),
    allowNull: false,
    comment: 'Method used to detect the activity'
  },
  
  detection_rule_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID of the rule that triggered the detection'
  },
  
  model_version: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Version of ML model used for detection'
  },
  
  // Status and workflow
  status: {
    type: DataTypes.ENUM('new', 'investigating', 'escalated', 'resolved', 'false_positive', 'confirmed'),
    allowNull: false,
    defaultValue: 'new',
    comment: 'Current status of the investigation'
  },
  
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal',
    comment: 'Investigation priority'
  },
  
  // Investigation details
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID of assigned investigator'
  },
  
  investigation_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Investigation notes and findings'
  },
  
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Resolution details'
  },
  
  resolution_action: {
    type: DataTypes.ENUM(
      'no_action',
      'warning_issued',
      'account_restricted',
      'account_suspended',
      'account_closed',
      'transaction_blocked',
      'withdrawal_blocked',
      'trading_restricted',
      'kyc_required',
      'manual_review',
      'reported_authorities',
      'other'
    ),
    allowNull: true,
    comment: 'Action taken as resolution'
  },
  
  // Timing
  detected_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the activity was detected'
  },
  
  occurred_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the suspicious activity actually occurred'
  },
  
  investigated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When investigation started'
  },
  
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the case was resolved'
  },
  
  // Compliance and reporting
  requires_sar: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this requires a Suspicious Activity Report'
  },
  
  sar_filed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether SAR has been filed'
  },
  
  sar_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'SAR reference number'
  },
  
  regulatory_reported: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether reported to regulatory authorities'
  },
  
  // Related activities
  related_activities: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    comment: 'IDs of related suspicious activities'
  },
  
  parent_case_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Parent case ID if this is part of a larger investigation'
  },
  
  // Metadata
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Tags for categorization and search'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata and context'
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
  tableName: 'suspicious_activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'activity_type']
    },
    {
      fields: ['activity_type', 'severity']
    },
    {
      fields: ['status', 'priority']
    },
    {
      fields: ['risk_score']
    },
    {
      fields: ['confidence_score']
    },
    {
      fields: ['detected_at']
    },
    {
      fields: ['occurred_at']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['country_code']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['requires_sar', 'sar_filed']
    },
    {
      fields: ['parent_case_id']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['order_id']
    },
    {
      fields: ['detection_method']
    }
  ],
  validate: {
    confidenceScoreValid() {
      const score = parseFloat(this.confidence_score);
      if (score < 0 || score > 1) {
        throw new Error('Confidence score must be between 0 and 1');
      }
    },
    riskScoreValid() {
      if (this.risk_score < 0 || this.risk_score > 100) {
        throw new Error('Risk score must be between 0 and 100');
      }
    },
    resolutionConsistency() {
      const resolvedStatuses = ['resolved', 'false_positive', 'confirmed'];
      if (resolvedStatuses.includes(this.status)) {
        if (!this.resolved_at) {
          throw new Error('Resolved activities must have resolved_at timestamp');
        }
      }
    }
  }
});

// Associations
SuspiciousActivity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SuspiciousActivity.belongsTo(User, { foreignKey: 'assigned_to', as: 'investigator' });
// Associations are defined in models/index.js

// Instance methods
SuspiciousActivity.prototype.isHighRisk = function() {
  return this.severity === 'critical' || this.risk_score >= 80;
};

SuspiciousActivity.prototype.requiresImmediateAction = function() {
  return this.severity === 'critical' && this.priority === 'urgent';
};

SuspiciousActivity.prototype.isResolved = function() {
  return ['resolved', 'false_positive', 'confirmed'].includes(this.status);
};

SuspiciousActivity.prototype.getAgeInHours = function() {
  const now = new Date();
  const detected = new Date(this.detected_at);
  return Math.floor((now - detected) / (1000 * 60 * 60));
};

SuspiciousActivity.prototype.assignTo = async function(investigatorId, transaction = null) {
  this.assigned_to = investigatorId;
  this.status = 'investigating';
  this.investigated_at = new Date();
  
  return await this.save({ transaction });
};

SuspiciousActivity.prototype.addNote = async function(note, transaction = null) {
  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] ${note}`;
  
  if (this.investigation_notes) {
    this.investigation_notes += '\n\n' + newNote;
  } else {
    this.investigation_notes = newNote;
  }
  
  return await this.save({ transaction });
};

SuspiciousActivity.prototype.resolve = async function(resolution, action = 'no_action', transaction = null) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolution_action = action;
  this.resolved_at = new Date();
  
  return await this.save({ transaction });
};

SuspiciousActivity.prototype.markAsFalsePositive = async function(reason, transaction = null) {
  this.status = 'false_positive';
  this.resolution = `False positive: ${reason}`;
  this.resolution_action = 'no_action';
  this.resolved_at = new Date();
  
  return await this.save({ transaction });
};

SuspiciousActivity.prototype.escalate = async function(reason, transaction = null) {
  this.status = 'escalated';
  this.priority = 'urgent';
  
  await this.addNote(`Escalated: ${reason}`, transaction);
  
  return await this.save({ transaction });
};

SuspiciousActivity.prototype.linkRelatedActivity = async function(relatedActivityId, transaction = null) {
  if (!this.related_activities) {
    this.related_activities = [];
  }
  
  if (!this.related_activities.includes(relatedActivityId)) {
    this.related_activities.push(relatedActivityId);
    return await this.save({ transaction });
  }
  
  return this;
};

// Static methods
SuspiciousActivity.createActivity = async function(activityData, transaction = null) {
  // Auto-calculate occurred_at if not provided
  if (!activityData.occurred_at) {
    activityData.occurred_at = activityData.detected_at || new Date();
  }
  
  // Auto-assign priority based on severity
  if (!activityData.priority) {
    const priorityMap = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high',
      'critical': 'urgent'
    };
    activityData.priority = priorityMap[activityData.severity] || 'normal';
  }
  
  return await SuspiciousActivity.create(activityData, { transaction });
};

SuspiciousActivity.getUnassignedActivities = async function(severity = null) {
  const where = {
    assigned_to: null,
    status: 'new'
  };
  
  if (severity) {
    where.severity = severity;
  }
  
  return await SuspiciousActivity.findAll({
    where,
    include: [{ model: User, as: 'user' }],
    order: [['risk_score', 'DESC'], ['detected_at', 'ASC']]
  });
};

SuspiciousActivity.getHighRiskActivities = async function(riskThreshold = 80) {
  return await SuspiciousActivity.findAll({
    where: {
      risk_score: { [sequelize.Op.gte]: riskThreshold },
      status: { [sequelize.Op.notIn]: ['resolved', 'false_positive'] }
    },
    include: [
      { model: User, as: 'user' },
      { model: User, as: 'investigator' }
    ],
    order: [['risk_score', 'DESC']]
  });
};

SuspiciousActivity.getActivitiesByUser = async function(userId, includeResolved = false) {
  const where = { user_id: userId };
  
  if (!includeResolved) {
    where.status = { [sequelize.Op.notIn]: ['resolved', 'false_positive'] };
  }
  
  return await SuspiciousActivity.findAll({
    where,
    order: [['detected_at', 'DESC']]
  });
};

SuspiciousActivity.getActivitiesByType = async function(activityType, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await SuspiciousActivity.findAll({
    where: {
      activity_type: activityType,
      detected_at: { [sequelize.Op.gte]: startDate }
    },
    include: [{ model: User, as: 'user' }],
    order: [['detected_at', 'DESC']]
  });
};

SuspiciousActivity.getOverdueActivities = async function(hoursThreshold = 24) {
  const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  
  return await SuspiciousActivity.findAll({
    where: {
      detected_at: { [sequelize.Op.lte]: thresholdDate },
      status: { [sequelize.Op.notIn]: ['resolved', 'false_positive'] }
    },
    include: [
      { model: User, as: 'user' },
      { model: User, as: 'investigator' }
    ],
    order: [['detected_at', 'ASC']]
  });
};

SuspiciousActivity.getStatistics = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await SuspiciousActivity.findAll({
    where: {
      detected_at: { [sequelize.Op.gte]: startDate }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_activities'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'new\' THEN 1 END')), 'new_activities'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'investigating\' THEN 1 END')), 'investigating'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'resolved\' THEN 1 END')), 'resolved'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'false_positive\' THEN 1 END')), 'false_positives'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN severity = \'critical\' THEN 1 END')), 'critical_activities'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'avg_risk_score'],
      [sequelize.fn('AVG', sequelize.col('confidence_score')), 'avg_confidence_score']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

SuspiciousActivity.detectPatterns = async function(userId, activityType, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const activities = await SuspiciousActivity.findAll({
    where: {
      user_id: userId,
      activity_type: activityType,
      detected_at: { [sequelize.Op.gte]: startDate }
    },
    order: [['detected_at', 'ASC']]
  });
  
  // Simple pattern detection
  const patterns = {
    frequency: activities.length,
    avg_risk_score: activities.reduce((sum, a) => sum + a.risk_score, 0) / activities.length || 0,
    escalating_risk: false,
    time_clustering: false
  };
  
  // Check for escalating risk
  if (activities.length >= 3) {
    const recent = activities.slice(-3);
    patterns.escalating_risk = recent.every((activity, index) => {
      return index === 0 || activity.risk_score >= recent[index - 1].risk_score;
    });
  }
  
  // Check for time clustering (multiple activities within short time)
  if (activities.length >= 2) {
    const timeGaps = [];
    for (let i = 1; i < activities.length; i++) {
      const gap = new Date(activities[i].detected_at) - new Date(activities[i-1].detected_at);
      timeGaps.push(gap / (1000 * 60 * 60)); // Convert to hours
    }
    patterns.time_clustering = timeGaps.some(gap => gap < 1); // Activities within 1 hour
  }
  
  return patterns;
};

module.exports = SuspiciousActivity;