const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { cache } = require('../config/redis');
const { query } = require('../config/database');
const geoip = require('geoip-lite');
const useragent = require('useragent');

// Audit log levels
const AUDIT_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Audit event types
const AUDIT_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  TWO_FA_ENABLED: '2fa_enabled',
  TWO_FA_DISABLED: '2fa_disabled',
  TWO_FA_VERIFIED: '2fa_verified',
  TWO_FA_FAILED: '2fa_failed',
  
  // Account events
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_VERIFIED: 'account_verified',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  ACCOUNT_DELETED: 'account_deleted',
  
  // Trading events
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_FILLED: 'order_filled',
  TRADE_EXECUTED: 'trade_executed',
  
  // Wallet events
  WALLET_CREATED: 'wallet_created',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  IP_BLOCKED: 'ip_blocked',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  
  // Admin events
  ADMIN_LOGIN: 'admin_login',
  ADMIN_ACTION: 'admin_action',
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  
  // API events
  API_KEY_CREATED: 'api_key_created',
  API_KEY_DELETED: 'api_key_deleted',
  API_CALL: 'api_call'
};

// Configure Winston logger for audit logs
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Daily rotate file for audit logs
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info'
    }),
    
    // Separate file for critical events
    new DailyRotateFile({
      filename: 'logs/audit-critical-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'error'
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV === 'development') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Audit Logger Service
class AuditLoggerService {
  constructor() {
    this.logger = auditLogger;
  }

  // Extract client information from request
  extractClientInfo(req) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const agent = useragent.parse(userAgent);
    const geo = geoip.lookup(ip);
    
    return {
      ip,
      userAgent,
      browser: `${agent.family} ${agent.major}`,
      os: `${agent.os.family} ${agent.os.major}`,
      device: agent.device.family,
      location: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      } : null
    };
  }

  // Log audit event
  async logEvent(eventType, data = {}, req = null, level = AUDIT_LEVELS.INFO) {
    try {
      const timestamp = new Date().toISOString();
      const clientInfo = req ? this.extractClientInfo(req) : null;
      
      const auditEntry = {
        timestamp,
        eventType,
        level,
        userId: data.userId || null,
        sessionId: data.sessionId || (req && req.sessionID) || null,
        clientInfo,
        data: {
          ...data,
          // Remove sensitive information
          password: undefined,
          token: undefined,
          secret: undefined
        },
        metadata: {
          requestId: req && req.id,
          correlationId: data.correlationId || null,
          source: 'audit_logger',
          version: '1.0.0'
        }
      };

      // Log to Winston
      this.logger.log(level, 'Audit Event', auditEntry);

      // Store in database for critical events
      if (level === AUDIT_LEVELS.ERROR || level === AUDIT_LEVELS.CRITICAL) {
        await this.storeInDatabase(auditEntry);
      }

      // Cache recent events for quick access
      await this.cacheRecentEvent(auditEntry);

      return auditEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to avoid breaking main application flow
    }
  }

  // Store audit entry in database
  async storeInDatabase(auditEntry) {
    try {
      const sql = `
        INSERT INTO audit_logs (
          id, timestamp, event_type, level, user_id, session_id,
          ip_address, user_agent, location, data, metadata
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `;
      
      const values = [
        auditEntry.timestamp,
        auditEntry.eventType,
        auditEntry.level,
        auditEntry.userId,
        auditEntry.sessionId,
        auditEntry.clientInfo?.ip,
        auditEntry.clientInfo?.userAgent,
        JSON.stringify(auditEntry.clientInfo?.location),
        JSON.stringify(auditEntry.data),
        JSON.stringify(auditEntry.metadata)
      ];
      
      await query(sql, values);
    } catch (error) {
      console.error('Database audit logging error:', error);
    }
  }

  // Cache recent events for monitoring
  async cacheRecentEvent(auditEntry) {
    try {
      const cacheKey = `audit:recent:${auditEntry.eventType}`;
      const recentEvents = await cache.get(cacheKey) || [];
      
      // Keep only last 100 events per type
      recentEvents.unshift(auditEntry);
      if (recentEvents.length > 100) {
        recentEvents.splice(100);
      }
      
      await cache.set(cacheKey, recentEvents, 3600); // 1 hour
    } catch (error) {
      console.error('Cache audit logging error:', error);
    }
  }

  // Convenience methods for common events
  async logLogin(userId, success, req, additionalData = {}) {
    const eventType = success ? AUDIT_EVENTS.LOGIN_SUCCESS : AUDIT_EVENTS.LOGIN_FAILED;
    const level = success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.WARN;
    
    return this.logEvent(eventType, {
      userId,
      success,
      ...additionalData
    }, req, level);
  }

  async logTrade(userId, tradeData, req) {
    return this.logEvent(AUDIT_EVENTS.TRADE_EXECUTED, {
      userId,
      tradeId: tradeData.id,
      symbol: tradeData.symbol,
      side: tradeData.side,
      amount: tradeData.amount,
      price: tradeData.price,
      value: tradeData.value
    }, req, AUDIT_LEVELS.INFO);
  }

  async logWithdrawal(userId, withdrawalData, req) {
    return this.logEvent(AUDIT_EVENTS.WITHDRAWAL, {
      userId,
      withdrawalId: withdrawalData.id,
      currency: withdrawalData.currency,
      amount: withdrawalData.amount,
      address: withdrawalData.address,
      status: withdrawalData.status
    }, req, AUDIT_LEVELS.INFO);
  }

  async logSecurityEvent(eventType, userId, req, additionalData = {}) {
    return this.logEvent(eventType, {
      userId,
      ...additionalData
    }, req, AUDIT_LEVELS.ERROR);
  }

  async logAdminAction(adminUserId, action, targetUserId, req, additionalData = {}) {
    return this.logEvent(AUDIT_EVENTS.ADMIN_ACTION, {
      adminUserId,
      action,
      targetUserId,
      ...additionalData
    }, req, AUDIT_LEVELS.INFO);
  }

  // Get recent events by type
  async getRecentEvents(eventType, limit = 50) {
    try {
      const cacheKey = `audit:recent:${eventType}`;
      const events = await cache.get(cacheKey) || [];
      return events.slice(0, limit);
    } catch (error) {
      console.error('Get recent events error:', error);
      return [];
    }
  }

  // Search audit logs in database
  async searchLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const values = [];
      let paramCount = 0;

      if (filters.userId) {
        sql += ` AND user_id = $${++paramCount}`;
        values.push(filters.userId);
      }

      if (filters.eventType) {
        sql += ` AND event_type = $${++paramCount}`;
        values.push(filters.eventType);
      }

      if (filters.level) {
        sql += ` AND level = $${++paramCount}`;
        values.push(filters.level);
      }

      if (filters.startDate) {
        sql += ` AND timestamp >= $${++paramCount}`;
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ` AND timestamp <= $${++paramCount}`;
        values.push(filters.endDate);
      }

      if (filters.ipAddress) {
        sql += ` AND ip_address = $${++paramCount}`;
        values.push(filters.ipAddress);
      }

      sql += ` ORDER BY timestamp DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      values.push(limit, offset);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Search audit logs error:', error);
      return [];
    }
  }

  // Get audit statistics
  async getStatistics(timeframe = '24h') {
    try {
      const timeMap = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = timeMap[timeframe] || '24 hours';
      
      const sql = `
        SELECT 
          event_type,
          level,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY event_type, level
        ORDER BY count DESC
      `;

      const result = await query(sql);
      return result.rows;
    } catch (error) {
      console.error('Get audit statistics error:', error);
      return [];
    }
  }
}

// Create and export audit logger instance
const auditLoggerService = new AuditLoggerService();

module.exports = {
  auditLoggerService,
  AuditLoggerService,
  AUDIT_EVENTS,
  AUDIT_LEVELS
};