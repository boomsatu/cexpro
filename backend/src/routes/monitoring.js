const express = require('express');
const router = express.Router();
const performanceService = require('../services/performanceService');
const loadBalancer = require('../middleware/loadBalancer');
const dbOptimization = require('../utils/dbOptimization');
const redis = require('../config/redis');
const { pgPool } = require('../config/database');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

// Rate limiting for monitoring endpoints
const monitoringRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many monitoring requests'
});

// Authentication middleware for monitoring endpoints
const adminAuth = auth.requireRole(['admin', 'operator']);

// System Health Check
router.get('/health', monitoringRateLimit, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Check database connectivity
    try {
      await pgPool.query('SELECT 1');
      health.database = { status: 'connected', type: 'postgresql' };
    } catch (error) {
      health.database = { status: 'disconnected', error: error.message };
      health.status = 'degraded';
    }
    
    // Check Redis connectivity
    try {
      await redis.client.ping();
      health.cache = { status: 'connected', type: 'redis' };
    } catch (error) {
      health.cache = { status: 'disconnected', error: error.message };
      health.status = 'degraded';
    }
    
    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    health.memory = memUsageMB;
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    health.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed Performance Metrics
router.get('/metrics', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const metrics = await performanceService.monitorPerformance();
    const loadBalancerStats = loadBalancer.getStats();
    const dbStats = dbOptimization.getOptimizationStats();
    
    const detailedMetrics = {
      timestamp: new Date().toISOString(),
      performance: metrics,
      loadBalancer: loadBalancerStats,
      database: dbStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime()
      }
    };
    
    res.json(detailedMetrics);
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Database Performance Analysis
router.get('/database/performance', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const queryMonitoring = await dbOptimization.monitorQueries();
    const connectionPoolStats = await dbOptimization.optimizeConnectionPool();
    const indexRecommendations = await dbOptimization.optimizeIndexes();
    
    res.json({
      timestamp: new Date().toISOString(),
      connectionPool: connectionPoolStats,
      queries: queryMonitoring,
      indexOptimization: indexRecommendations
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze database performance',
      message: error.message
    });
  }
});

// Query Plan Analysis
router.post('/database/analyze-query', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    
    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }
    
    const analysis = await dbOptimization.analyzeQueryPlan(sql, params);
    
    if (!analysis) {
      return res.status(400).json({ error: 'Failed to analyze query plan' });
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      query: sql,
      analysis
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Query analysis failed',
      message: error.message
    });
  }
});

// Cache Performance Metrics
router.get('/cache/metrics', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    // Redis info
    const redisInfo = await redis.client.info();
    const redisMemory = await redis.client.info('memory');
    const redisStats = await redis.client.info('stats');
    
    // Parse Redis info
    const parseRedisInfo = (info) => {
      const lines = info.split('\r\n');
      const result = {};
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = isNaN(value) ? value : Number(value);
        }
      });
      return result;
    };
    
    const memoryInfo = parseRedisInfo(redisMemory);
    const statsInfo = parseRedisInfo(redisStats);
    
    // Get cache hit ratio from performance service
    const performanceMetrics = await performanceService.monitorPerformance();
    
    res.json({
      timestamp: new Date().toISOString(),
      redis: {
        memory: {
          used: memoryInfo.used_memory_human,
          peak: memoryInfo.used_memory_peak_human,
          fragmentation: memoryInfo.mem_fragmentation_ratio
        },
        stats: {
          connections: statsInfo.connected_clients,
          commands: statsInfo.total_commands_processed,
          keyspace_hits: statsInfo.keyspace_hits,
          keyspace_misses: statsInfo.keyspace_misses,
          hit_rate: statsInfo.keyspace_hits / (statsInfo.keyspace_hits + statsInfo.keyspace_misses) * 100
        }
      },
      application: performanceMetrics.cache
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cache metrics',
      message: error.message
    });
  }
});

// Load Balancer Status
router.get('/loadbalancer/status', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const stats = loadBalancer.getStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      loadBalancer: stats
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve load balancer status',
      message: error.message
    });
  }
});

// Slow Query Log
router.get('/database/slow-queries', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Get slow queries from Redis log
    const slowQueries = await redis.cache.lrange('slow_queries', 0, limit - 1);
    const parsedQueries = slowQueries.map(query => JSON.parse(query));
    
    res.json({
      timestamp: new Date().toISOString(),
      slowQueries: parsedQueries,
      total: parsedQueries.length
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve slow queries',
      message: error.message
    });
  }
});

// Performance Alerts
router.get('/alerts', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const { since } = req.query;
    const sinceTime = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get alerts from Redis (in a real implementation, you'd store alerts)
    const alerts = await redis.cache.lrange('performance_alerts', 0, 99);
    const parsedAlerts = alerts
      .map(alert => JSON.parse(alert))
      .filter(alert => new Date(alert.timestamp) >= sinceTime)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      timestamp: new Date().toISOString(),
      alerts: parsedAlerts,
      total: parsedAlerts.length
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

// System Resource Usage
router.get('/resources', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const os = require('os');
    
    const resources = {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        process: process.memoryUsage(),
        system: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        }
      },
      disk: await getDiskUsage(),
      network: os.networkInterfaces()
    };
    
    res.json(resources);
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve resource usage',
      message: error.message
    });
  }
});

// Trading Performance Metrics
router.get('/trading/performance', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    
    // Get trading metrics from database
    const tradingMetrics = await getTradingMetrics(timeframe);
    
    res.json({
      timestamp: new Date().toISOString(),
      timeframe,
      metrics: tradingMetrics
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve trading performance metrics',
      message: error.message
    });
  }
});

// WebSocket Connection Metrics
router.get('/websocket/metrics', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    // Get WebSocket metrics (would be implemented in WebSocket service)
    const wsMetrics = {
      totalConnections: 0, // Would get from WebSocket service
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      connectionsByType: {
        trading: 0,
        market_data: 0,
        notifications: 0
      }
    };
    
    res.json({
      timestamp: new Date().toISOString(),
      websocket: wsMetrics
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve WebSocket metrics',
      message: error.message
    });
  }
});

// Performance Dashboard Data
router.get('/dashboard', monitoringRateLimit, adminAuth, async (req, res) => {
  try {
    const [health, metrics, dbPerf, cacheMetrics, lbStats] = await Promise.all([
      getHealthStatus(),
      performanceService.monitorPerformance(),
      dbOptimization.monitorQueries(),
      getCacheMetrics(),
      loadBalancer.getStats()
    ]);
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      overview: {
        status: health.status,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      },
      performance: {
        responseTime: metrics.queries.p95Time,
        throughput: lbStats.totalRequests,
        errorRate: 0, // Would calculate from logs
        availability: 99.9 // Would calculate from uptime
      },
      resources: {
        cpu: metrics.system.cpuUser,
        memory: metrics.memory.utilization,
        database: dbPerf ? dbPerf.connectionStats : {},
        cache: cacheMetrics.application
      },
      alerts: [], // Would get recent alerts
      trends: {} // Would include historical data
    };
    
    res.json(dashboard);
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

// Helper Functions
async function getHealthStatus() {
  try {
    await pgPool.query('SELECT 1');
    await redis.client.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'degraded', error: error.message };
  }
}

async function getCacheMetrics() {
  try {
    const redisInfo = await redis.client.info('stats');
    const lines = redisInfo.split('\r\n');
    const stats = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = isNaN(value) ? value : Number(value);
      }
    });
    
    const performanceMetrics = await performanceService.monitorPerformance();
    
    return {
      redis: stats,
      application: performanceMetrics.cache
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getDiskUsage() {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat('.');
    
    return {
      total: 0, // Would implement actual disk usage calculation
      used: 0,
      free: 0,
      percentage: 0
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getTradingMetrics(timeframe) {
  try {
    const timeCondition = getTimeCondition(timeframe);
    
    const [orderStats, tradeStats, volumeStats] = await Promise.all([
      pgPool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'filled' THEN 1 END) as filled_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_fill_time
        FROM orders 
        WHERE created_at >= ${timeCondition}
      `),
      pgPool.query(`
        SELECT 
          COUNT(*) as total_trades,
          SUM(quantity) as total_volume,
          AVG(price) as avg_price
        FROM trades 
        WHERE created_at >= ${timeCondition}
      `),
      pgPool.query(`
        SELECT 
          trading_pair_id,
          SUM(quantity * price) as volume_24h
        FROM trades 
        WHERE created_at >= ${timeCondition}
        GROUP BY trading_pair_id
        ORDER BY volume_24h DESC
        LIMIT 10
      `)
    ]);
    
    return {
      orders: orderStats.rows[0],
      trades: tradeStats.rows[0],
      topPairs: volumeStats.rows
    };
  } catch (error) {
    return { error: error.message };
  }
}

function getTimeCondition(timeframe) {
  const intervals = {
    '1h': "NOW() - INTERVAL '1 hour'",
    '24h': "NOW() - INTERVAL '24 hours'",
    '7d': "NOW() - INTERVAL '7 days'",
    '30d': "NOW() - INTERVAL '30 days'"
  };
  
  return intervals[timeframe] || intervals['24h'];
}

// Setup performance service event listeners for alerts
performanceService.on('alert', async (alert) => {
  try {
    const alertData = {
      ...alert,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    // Store alert in Redis
    await redis.cache.lpush('performance_alerts', JSON.stringify(alertData));
    await redis.cache.ltrim('performance_alerts', 0, 999); // Keep last 1000 alerts
    
    console.log('Performance alert:', alertData);
  } catch (error) {
    console.error('Error handling performance alert:', error);
    // Continue without crashing to prevent unhandled rejection
  }
});

module.exports = router;