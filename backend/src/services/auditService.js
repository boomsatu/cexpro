const { db } = require('../config/database');
const { cache } = require('../config/redis');
const crypto = require('crypto');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

// Audit log levels
const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Audit event types
const EVENT_TYPES = {
  // Authentication events
  USER_REGISTER: 'user_register',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_LOGIN_FAILED: 'user_login_failed',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  EMAIL_VERIFICATION: 'email_verification',
  
  // 2FA events
  TWO_FA_ENABLED: '2fa_enabled',
  TWO_FA_DISABLED: '2fa_disabled',
  TWO_FA_VERIFIED: '2fa_verified',
  TWO_FA_FAILED: '2fa_failed',
  BACKUP_CODE_USED: 'backup_code_used',
  
  // Account events
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_REACTIVATED: 'account_reactivated',
  PROFILE_UPDATED: 'profile_updated',
  
  // KYC events
  KYC_SUBMITTED: 'kyc_submitted',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  KYC_DOCUMENT_UPLOADED: 'kyc_document_uploaded',
  
  // Trading events
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_FILLED: 'order_filled',
  TRADE_EXECUTED: 'trade_executed',
  
  // Wallet events
  DEPOSIT_INITIATED: 'deposit_initiated',
  DEPOSIT_CONFIRMED: 'deposit_confirmed',
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  WITHDRAWAL_COMPLETED: 'withdrawal_completed',
  WALLET_CREATED: 'wallet_created',
  ADDRESS_GENERATED: 'address_generated',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  IP_BLOCKED: 'ip_blocked',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_DELETED: 'api_key_deleted',
  API_KEY_USED: 'api_key_used',
  
  // Admin events
  ADMIN_LOGIN: 'admin_login',
  ADMIN_ACTION: 'admin_action',
  USER_IMPERSONATION: 'user_impersonation',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
  
  // System events
  SYSTEM_ERROR: 'system_error',
  DATABASE_ERROR: 'database_error',
  EXTERNAL_API_ERROR: 'external_api_error',
  MAINTENANCE_MODE: 'maintenance_mode'
};

// Risk levels
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Create audit log entry
const createAuditLog = async (logData) => {
  try {
    const {
      userId,
      eventType,
      level = LOG_LEVELS.INFO,
      riskLevel = RISK_LEVELS.LOW,
      description,
      metadata = {},
      ipAddress,
      userAgent,
      sessionId,
      apiKeyId,
      adminUserId
    } = logData;

    // Generate unique log ID
    const logId = crypto.randomUUID();
    
    // Parse user agent
    const parser = new UAParser(userAgent);
    const deviceInfo = {
      browser: parser.getBrowser(),
      os: parser.getOS(),
      device: parser.getDevice()
    };
    
    // Get location from IP
    const location = ipAddress ? geoip.lookup(ipAddress) : null;
    
    // Create fingerprint for duplicate detection
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userId}-${eventType}-${ipAddress}-${JSON.stringify(metadata)}`)
      .digest('hex');
    
    // Check for recent duplicate
    const duplicateKey = `audit_fingerprint:${fingerprint}`;
    const isDuplicate = await cache.exists(duplicateKey);
    
    if (isDuplicate && level !== LOG_LEVELS.CRITICAL) {
      console.log('Duplicate audit log detected, skipping:', { eventType, userId });
      return null;
    }
    
    // Set duplicate prevention cache (5 minutes)
    await cache.setex(duplicateKey, 300, '1');
    
    // Prepare audit log data
    const auditLogData = {
      id: logId,
      user_id: userId,
      event_type: eventType,
      level,
      risk_level: riskLevel,
      description,
      metadata: JSON.stringify({
        ...metadata,
        deviceInfo,
        location: location ? {
          country: location.country,
          region: location.region,
          city: location.city,
          timezone: location.timezone
        } : null
      }),
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: sessionId,
      api_key_id: apiKeyId,
      admin_user_id: adminUserId,
      fingerprint,
      created_at: new Date()
    };
    
    // Insert into database
    const query = `
      INSERT INTO audit_logs (
        id, user_id, event_type, level, risk_level, description, 
        metadata, ip_address, user_agent, session_id, api_key_id, 
        admin_user_id, fingerprint, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;
    
    const values = [
      auditLogData.id,
      auditLogData.user_id,
      auditLogData.event_type,
      auditLogData.level,
      auditLogData.risk_level,
      auditLogData.description,
      auditLogData.metadata,
      auditLogData.ip_address,
      auditLogData.user_agent,
      auditLogData.session_id,
      auditLogData.api_key_id,
      auditLogData.admin_user_id,
      auditLogData.fingerprint,
      auditLogData.created_at
    ];
    
    const result = await db.query(query, values);
    const createdLog = result.rows[0];
    
    // Cache recent logs for quick access
    if (userId) {
      const userLogsKey = `user_audit_logs:${userId}`;
      await cache.lpush(userLogsKey, JSON.stringify(createdLog));
      await cache.ltrim(userLogsKey, 0, 99); // Keep last 100 logs
      await cache.expire(userLogsKey, 86400); // 24 hours
    }
    
    // Alert on high-risk events
    if (riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL) {
      await alertHighRiskEvent(createdLog);
    }
    
    // Real-time notification for critical events
    if (level === LOG_LEVELS.CRITICAL) {
      await notifyCriticalEvent(createdLog);
    }
    
    console.log('Audit log created:', {
      id: logId,
      eventType,
      userId,
      level,
      riskLevel
    });
    
    return createdLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

// Get audit logs with filtering
const getAuditLogs = async (filters = {}) => {
  try {
    const {
      userId,
      eventType,
      level,
      riskLevel,
      startDate,
      endDate,
      ipAddress,
      limit = 100,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 0;
    
    // Add filters
    if (userId) {
      query += ` AND user_id = $${++paramCount}`;
      values.push(userId);
    }
    
    if (eventType) {
      if (Array.isArray(eventType)) {
        query += ` AND event_type = ANY($${++paramCount})`;
        values.push(eventType);
      } else {
        query += ` AND event_type = $${++paramCount}`;
        values.push(eventType);
      }
    }
    
    if (level) {
      query += ` AND level = $${++paramCount}`;
      values.push(level);
    }
    
    if (riskLevel) {
      query += ` AND risk_level = $${++paramCount}`;
      values.push(riskLevel);
    }
    
    if (startDate) {
      query += ` AND created_at >= $${++paramCount}`;
      values.push(startDate);
    }
    
    if (endDate) {
      query += ` AND created_at <= $${++paramCount}`;
      values.push(endDate);
    }
    
    if (ipAddress) {
      query += ` AND ip_address = $${++paramCount}`;
      values.push(ipAddress);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);
    
    const result = await db.query(query, values);
    
    // Parse metadata
    const logs = result.rows.map(log => ({
      ...log,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
    }));
    
    return logs;
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    throw error;
  }
};

// Get user activity summary
const getUserActivitySummary = async (userId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const query = `
      SELECT 
        event_type,
        level,
        risk_level,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM audit_logs 
      WHERE user_id = $1 AND created_at >= $2
      GROUP BY event_type, level, risk_level
      ORDER BY count DESC
    `;
    
    const result = await db.query(query, [userId, startDate]);
    
    // Get total counts by level and risk
    const summary = {
      totalEvents: 0,
      byLevel: { info: 0, warning: 0, error: 0, critical: 0 },
      byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
      byEventType: {},
      recentActivity: result.rows
    };
    
    result.rows.forEach(row => {
      summary.totalEvents += parseInt(row.count);
      summary.byLevel[row.level] += parseInt(row.count);
      summary.byRisk[row.risk_level] += parseInt(row.count);
      
      if (!summary.byEventType[row.event_type]) {
        summary.byEventType[row.event_type] = 0;
      }
      summary.byEventType[row.event_type] += parseInt(row.count);
    });
    
    return summary;
  } catch (error) {
    console.error('Failed to get user activity summary:', error);
    throw error;
  }
};

// Detect suspicious patterns
const detectSuspiciousActivity = async (userId) => {
  try {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    // Get recent activity
    const recentLogs = await getAuditLogs({
      userId,
      startDate: last24Hours,
      limit: 1000
    });
    
    const suspiciousPatterns = [];
    
    // Pattern 1: Multiple failed login attempts
    const failedLogins = recentLogs.filter(log => 
      log.event_type === EVENT_TYPES.USER_LOGIN_FAILED
    );
    
    if (failedLogins.length >= 5) {
      suspiciousPatterns.push({
        type: 'multiple_failed_logins',
        severity: 'high',
        count: failedLogins.length,
        description: `${failedLogins.length} failed login attempts in 24 hours`
      });
    }
    
    // Pattern 2: Multiple IP addresses
    const uniqueIPs = new Set(recentLogs.map(log => log.ip_address).filter(Boolean));
    
    if (uniqueIPs.size >= 5) {
      suspiciousPatterns.push({
        type: 'multiple_ip_addresses',
        severity: 'medium',
        count: uniqueIPs.size,
        description: `Activity from ${uniqueIPs.size} different IP addresses`
      });
    }
    
    // Pattern 3: Rapid successive actions
    const rapidActions = recentLogs.filter((log, index) => {
      if (index === 0) return false;
      const prevLog = recentLogs[index - 1];
      const timeDiff = new Date(log.created_at) - new Date(prevLog.created_at);
      return timeDiff < 1000; // Less than 1 second apart
    });
    
    if (rapidActions.length >= 10) {
      suspiciousPatterns.push({
        type: 'rapid_successive_actions',
        severity: 'medium',
        count: rapidActions.length,
        description: `${rapidActions.length} actions performed in rapid succession`
      });
    }
    
    // Pattern 4: Unusual time activity
    const unusualTimeActions = recentLogs.filter(log => {
      const hour = new Date(log.created_at).getHours();
      return hour >= 2 && hour <= 5; // 2 AM to 5 AM
    });
    
    if (unusualTimeActions.length >= 10) {
      suspiciousPatterns.push({
        type: 'unusual_time_activity',
        severity: 'low',
        count: unusualTimeActions.length,
        description: `${unusualTimeActions.length} actions during unusual hours (2-5 AM)`
      });
    }
    
    return suspiciousPatterns;
  } catch (error) {
    console.error('Failed to detect suspicious activity:', error);
    return [];
  }
};

// Alert high-risk events
const alertHighRiskEvent = async (auditLog) => {
  try {
    const alertKey = `high_risk_alert:${auditLog.id}`;
    
    // Prevent duplicate alerts
    const alreadyAlerted = await cache.exists(alertKey);
    if (alreadyAlerted) return;
    
    // Set alert flag
    await cache.setex(alertKey, 3600, '1'); // 1 hour
    
    // Send alert to monitoring system
    console.warn('HIGH RISK EVENT DETECTED:', {
      id: auditLog.id,
      userId: auditLog.user_id,
      eventType: auditLog.event_type,
      riskLevel: auditLog.risk_level,
      description: auditLog.description,
      ipAddress: auditLog.ip_address,
      timestamp: auditLog.created_at
    });
    
    // TODO: Integrate with external alerting system (Slack, PagerDuty, etc.)
    
  } catch (error) {
    console.error('Failed to alert high-risk event:', error);
  }
};

// Notify critical events
const notifyCriticalEvent = async (auditLog) => {
  try {
    // Real-time notification via WebSocket
    // TODO: Implement WebSocket notification
    
    console.error('CRITICAL EVENT:', {
      id: auditLog.id,
      userId: auditLog.user_id,
      eventType: auditLog.event_type,
      description: auditLog.description,
      timestamp: auditLog.created_at
    });
    
  } catch (error) {
    console.error('Failed to notify critical event:', error);
  }
};

// Cleanup old audit logs
const cleanupOldLogs = async (retentionDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const query = 'DELETE FROM audit_logs WHERE created_at < $1';
    const result = await db.query(query, [cutoffDate]);
    
    console.log(`Cleaned up ${result.rowCount} old audit logs`);
    return result.rowCount;
  } catch (error) {
    console.error('Failed to cleanup old audit logs:', error);
    throw error;
  }
};

// Export audit data
const exportAuditData = async (filters = {}, format = 'json') => {
  try {
    const logs = await getAuditLogs({ ...filters, limit: 10000 });
    
    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'ID', 'User ID', 'Event Type', 'Level', 'Risk Level', 
        'Description', 'IP Address', 'Created At'
      ];
      
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          log.id,
          log.user_id || '',
          log.event_type,
          log.level,
          log.risk_level,
          `"${log.description.replace(/"/g, '""')}"`,
          log.ip_address || '',
          log.created_at
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return logs;
  } catch (error) {
    console.error('Failed to export audit data:', error);
    throw error;
  }
};

// Helper functions for common audit events
const logUserLogin = (userId, ipAddress, userAgent, sessionId, success = true) => {
  return createAuditLog({
    userId,
    eventType: success ? EVENT_TYPES.USER_LOGIN : EVENT_TYPES.USER_LOGIN_FAILED,
    level: success ? LOG_LEVELS.INFO : LOG_LEVELS.WARNING,
    riskLevel: success ? RISK_LEVELS.LOW : RISK_LEVELS.MEDIUM,
    description: success ? 'User logged in successfully' : 'User login failed',
    ipAddress,
    userAgent,
    sessionId
  });
};

const logUserLogout = (userId, ipAddress, userAgent, sessionId) => {
  return createAuditLog({
    userId,
    eventType: EVENT_TYPES.USER_LOGOUT,
    level: LOG_LEVELS.INFO,
    riskLevel: RISK_LEVELS.LOW,
    description: 'User logged out',
    ipAddress,
    userAgent,
    sessionId
  });
};

const logPasswordChange = (userId, ipAddress, userAgent) => {
  return createAuditLog({
    userId,
    eventType: EVENT_TYPES.PASSWORD_CHANGE,
    level: LOG_LEVELS.INFO,
    riskLevel: RISK_LEVELS.MEDIUM,
    description: 'User changed password',
    ipAddress,
    userAgent
  });
};

const logSuspiciousActivity = (userId, activityType, ipAddress, userAgent, metadata = {}) => {
  return createAuditLog({
    userId,
    eventType: EVENT_TYPES.SUSPICIOUS_ACTIVITY,
    level: LOG_LEVELS.WARNING,
    riskLevel: RISK_LEVELS.HIGH,
    description: `Suspicious activity detected: ${activityType}`,
    metadata: { activityType, ...metadata },
    ipAddress,
    userAgent
  });
};

module.exports = {
  // Constants
  LOG_LEVELS,
  EVENT_TYPES,
  RISK_LEVELS,
  
  // Core functions
  createAuditLog,
  getAuditLogs,
  getUserActivitySummary,
  detectSuspiciousActivity,
  cleanupOldLogs,
  exportAuditData,
  
  // Helper functions
  logUserLogin,
  logUserLogout,
  logPasswordChange,
  logSuspiciousActivity
};