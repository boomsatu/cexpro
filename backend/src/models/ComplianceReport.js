const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

/**
 * Model ComplianceReport untuk mengelola laporan kepatuhan regulasi
 * Mendukung berbagai jenis laporan seperti AML, KYC, SAR, CTR, dll.
 */
const ComplianceReport = sequelize.define('ComplianceReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Report identification
  report_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique report number'
  },
  
  report_type: {
    type: DataTypes.ENUM(
      'sar',           // Suspicious Activity Report
      'ctr',           // Currency Transaction Report
      'kyc_report',    // KYC Compliance Report
      'aml_report',    // AML Compliance Report
      'transaction_monitoring',
      'sanctions_screening',
      'pep_screening', // Politically Exposed Person
      'risk_assessment',
      'audit_report',
      'regulatory_filing',
      'internal_investigation',
      'customer_due_diligence',
      'enhanced_due_diligence',
      'periodic_review',
      'breach_notification',
      'other'
    ),
    allowNull: false,
    comment: 'Type of compliance report'
  },
  
  // Subject information
  subject_type: {
    type: DataTypes.ENUM('user', 'transaction', 'activity', 'system', 'general'),
    allowNull: false,
    comment: 'Type of subject being reported'
  },
  
  subject_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the subject (user_id, transaction_id, etc.)'
  },
  
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User associated with the report'
  },
  
  // Report content
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Report title'
  },
  
  summary: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Executive summary of the report'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed description of findings'
  },
  
  findings: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Structured findings and evidence'
  },
  
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Recommendations for action'
  },
  
  // Risk assessment
  risk_level: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    comment: 'Assessed risk level'
  },
  
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Numerical risk score (0-100)'
  },
  
  risk_factors: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'List of identified risk factors'
  },
  
  // Regulatory information
  regulatory_framework: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Applicable regulatory frameworks (AML, KYC, GDPR, etc.)'
  },
  
  jurisdiction: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Regulatory jurisdiction (country code)'
  },
  
  regulatory_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference to specific regulation or law'
  },
  
  // Status and workflow
  status: {
    type: DataTypes.ENUM(
      'draft',
      'under_review',
      'approved',
      'submitted',
      'acknowledged',
      'closed',
      'rejected',
      'requires_revision'
    ),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Current status of the report'
  },
  
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal',
    comment: 'Report priority'
  },
  
  // Personnel
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created the report'
  },
  
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who reviewed the report'
  },
  
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who approved the report'
  },
  
  // Timing
  incident_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when the incident occurred'
  },
  
  detection_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when the issue was detected'
  },
  
  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Due date for report submission'
  },
  
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the report was reviewed'
  },
  
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the report was approved'
  },
  
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the report was submitted to authorities'
  },
  
  // External submission
  submitted_to: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Authority or organization the report was submitted to'
  },
  
  submission_method: {
    type: DataTypes.ENUM('electronic', 'paper', 'email', 'portal', 'api'),
    allowNull: true,
    comment: 'Method used for submission'
  },
  
  submission_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference number from receiving authority'
  },
  
  acknowledgment_received: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether acknowledgment was received'
  },
  
  acknowledgment_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date acknowledgment was received'
  },
  
  // Follow-up
  requires_followup: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether follow-up is required'
  },
  
  followup_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date for follow-up action'
  },
  
  followup_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Follow-up notes and actions'
  },
  
  // Related data
  related_reports: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    comment: 'IDs of related compliance reports'
  },
  
  related_activities: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    comment: 'IDs of related suspicious activities'
  },
  
  related_transactions: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    comment: 'IDs of related transactions'
  },
  
  // Attachments and evidence
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'List of attached files and documents'
  },
  
  evidence: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Evidence and supporting documentation'
  },
  
  // Confidentiality
  confidentiality_level: {
    type: DataTypes.ENUM('public', 'internal', 'confidential', 'restricted'),
    allowNull: false,
    defaultValue: 'confidential',
    comment: 'Confidentiality classification'
  },
  
  access_restrictions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'List of roles/users with access'
  },
  
  // Retention
  retention_period: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Retention period in years'
  },
  
  retention_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When retention period expires'
  },
  
  // Metadata
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
  tableName: 'compliance_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['report_number'],
      unique: true
    },
    {
      fields: ['report_type', 'status']
    },
    {
      fields: ['user_id', 'report_type']
    },
    {
      fields: ['subject_type', 'subject_id']
    },
    {
      fields: ['risk_level', 'risk_score']
    },
    {
      fields: ['status', 'priority']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['reviewed_by']
    },
    {
      fields: ['approved_by']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['submitted_at']
    },
    {
      fields: ['jurisdiction']
    },
    {
      fields: ['incident_date']
    },
    {
      fields: ['detection_date']
    },
    {
      fields: ['requires_followup', 'followup_date']
    }
  ],
  validate: {
    riskScoreValid() {
      if (this.risk_score < 0 || this.risk_score > 100) {
        throw new Error('Risk score must be between 0 and 100');
      }
    },
    dueDateValid() {
      if (this.due_date && this.due_date <= new Date()) {
        throw new Error('Due date must be in the future');
      }
    },
    statusConsistency() {
      if (this.status === 'approved' && !this.approved_by) {
        throw new Error('Approved reports must have approved_by field');
      }
      if (this.status === 'submitted' && !this.submitted_at) {
        throw new Error('Submitted reports must have submitted_at timestamp');
      }
    }
  }
});

// Associations
ComplianceReport.belongsTo(User, { foreignKey: 'user_id', as: 'subject' });
// Associations are defined in models/index.js
ComplianceReport.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
ComplianceReport.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// Instance methods
ComplianceReport.prototype.isOverdue = function() {
  if (!this.due_date) return false;
  return new Date() > this.due_date && !['submitted', 'closed'].includes(this.status);
};

ComplianceReport.prototype.isDraft = function() {
  return this.status === 'draft';
};

ComplianceReport.prototype.isSubmitted = function() {
  return ['submitted', 'acknowledged', 'closed'].includes(this.status);
};

ComplianceReport.prototype.requiresApproval = function() {
  return ['sar', 'ctr', 'regulatory_filing'].includes(this.report_type);
};

ComplianceReport.prototype.canEdit = function() {
  return ['draft', 'requires_revision'].includes(this.status);
};

ComplianceReport.prototype.getAgeInDays = function() {
  const now = new Date();
  const created = new Date(this.created_at);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
};

ComplianceReport.prototype.generateReportNumber = function() {
  const year = new Date().getFullYear();
  const typeCode = this.report_type.toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString().slice(-6);
  return `${typeCode}-${year}-${timestamp}`;
};

ComplianceReport.prototype.submitForReview = async function(transaction = null) {
  if (!this.canEdit()) {
    throw new Error('Report cannot be submitted for review in current status');
  }
  
  this.status = 'under_review';
  return await this.save({ transaction });
};

ComplianceReport.prototype.approve = async function(approvedBy, transaction = null) {
  if (this.status !== 'under_review') {
    throw new Error('Only reports under review can be approved');
  }
  
  this.status = 'approved';
  this.approved_by = approvedBy;
  this.approved_at = new Date();
  
  return await this.save({ transaction });
};

ComplianceReport.prototype.reject = async function(reason, transaction = null) {
  if (this.status !== 'under_review') {
    throw new Error('Only reports under review can be rejected');
  }
  
  this.status = 'requires_revision';
  this.followup_notes = reason;
  
  return await this.save({ transaction });
};

ComplianceReport.prototype.submit = async function(submissionDetails, transaction = null) {
  if (this.requiresApproval() && this.status !== 'approved') {
    throw new Error('Report must be approved before submission');
  }
  
  this.status = 'submitted';
  this.submitted_at = new Date();
  this.submitted_to = submissionDetails.submitted_to;
  this.submission_method = submissionDetails.method || 'electronic';
  this.submission_reference = submissionDetails.reference || null;
  
  return await this.save({ transaction });
};

ComplianceReport.prototype.acknowledge = async function(acknowledgmentDate = null, transaction = null) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted reports can be acknowledged');
  }
  
  this.status = 'acknowledged';
  this.acknowledgment_received = true;
  this.acknowledgment_date = acknowledgmentDate || new Date();
  
  return await this.save({ transaction });
};

ComplianceReport.prototype.addAttachment = async function(attachment, transaction = null) {
  if (!this.attachments) {
    this.attachments = [];
  }
  
  this.attachments.push({
    ...attachment,
    added_at: new Date(),
    id: require('crypto').randomUUID()
  });
  
  return await this.save({ transaction });
};

ComplianceReport.prototype.linkRelatedReport = async function(reportId, transaction = null) {
  if (!this.related_reports) {
    this.related_reports = [];
  }
  
  if (!this.related_reports.includes(reportId)) {
    this.related_reports.push(reportId);
    return await this.save({ transaction });
  }
  
  return this;
};

// Static methods
ComplianceReport.createReport = async function(reportData, createdBy, transaction = null) {
  // Generate report number if not provided
  if (!reportData.report_number) {
    const tempReport = new ComplianceReport(reportData);
    reportData.report_number = tempReport.generateReportNumber();
  }
  
  reportData.created_by = createdBy;
  
  // Set default retention period based on report type
  if (!reportData.retention_period) {
    const retentionMap = {
      'sar': 5,
      'ctr': 5,
      'kyc_report': 7,
      'aml_report': 7,
      'audit_report': 10
    };
    reportData.retention_period = retentionMap[reportData.report_type] || 5;
  }
  
  // Calculate retention expiry
  if (reportData.retention_period) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + reportData.retention_period);
    reportData.retention_expires_at = expiryDate;
  }
  
  return await ComplianceReport.create(reportData, { transaction });
};

ComplianceReport.getOverdueReports = async function() {
  const now = new Date();
  
  return await ComplianceReport.findAll({
    where: {
      due_date: { [sequelize.Op.lte]: now },
      status: { [sequelize.Op.notIn]: ['submitted', 'closed'] }
    },
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'subject' }
    ],
    order: [['due_date', 'ASC']]
  });
};

ComplianceReport.getPendingReports = async function(reportType = null) {
  const where = {
    status: { [sequelize.Op.in]: ['draft', 'under_review', 'approved'] }
  };
  
  if (reportType) {
    where.report_type = reportType;
  }
  
  return await ComplianceReport.findAll({
    where,
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'subject' }
    ],
    order: [['priority', 'DESC'], ['created_at', 'ASC']]
  });
};

ComplianceReport.getReportsByUser = async function(userId, includeSubject = true) {
  const where = {};
  
  if (includeSubject) {
    where[sequelize.Op.or] = [
      { created_by: userId },
      { user_id: userId }
    ];
  } else {
    where.created_by = userId;
  }
  
  return await ComplianceReport.findAll({
    where,
    order: [['created_at', 'DESC']]
  });
};

ComplianceReport.getHighRiskReports = async function(riskThreshold = 80) {
  return await ComplianceReport.findAll({
    where: {
      risk_score: { [sequelize.Op.gte]: riskThreshold },
      status: { [sequelize.Op.notIn]: ['closed'] }
    },
    include: [
      { model: User, as: 'creator' },
      { model: User, as: 'subject' }
    ],
    order: [['risk_score', 'DESC']]
  });
};

ComplianceReport.getStatistics = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await ComplianceReport.findAll({
    where: {
      created_at: { [sequelize.Op.gte]: startDate }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_reports'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'draft\' THEN 1 END')), 'draft_reports'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'submitted\' THEN 1 END')), 'submitted_reports'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN report_type = \'sar\' THEN 1 END')), 'sar_reports'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN report_type = \'ctr\' THEN 1 END')), 'ctr_reports'],
      [sequelize.fn('AVG', sequelize.col('risk_score')), 'avg_risk_score'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN due_date < NOW() AND status NOT IN (\'submitted\', \'closed\') THEN 1 END')), 'overdue_reports']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

ComplianceReport.cleanupExpiredReports = async function() {
  const now = new Date();
  
  const expiredReports = await ComplianceReport.findAll({
    where: {
      retention_expires_at: { [sequelize.Op.lte]: now },
      status: 'closed'
    }
  });
  
  // Archive or delete expired reports based on policy
  // For now, we'll just mark them as archived
  const updatePromises = expiredReports.map(report => {
    if (!report.metadata) report.metadata = {};
    report.metadata.archived = true;
    report.metadata.archived_at = now;
    return report.save();
  });
  
  return await Promise.all(updatePromises);
};

module.exports = ComplianceReport;