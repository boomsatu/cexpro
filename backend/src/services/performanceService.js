const redis = require('../config/redis');
const { pgPool } = require('../config/database');
const EventEmitter = require('events');

class PerformanceService extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      queryTimes: new Map(),
      cacheHitRatio: { hits: 0, misses: 0 },
      connectionPoolStats: { active: 0, idle: 0, waiting: 0 },
      memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0 },
      responseTimeP95: 0,
      throughput: 0
    };
    
    this.startMetricsCollection();
  }

  // Advanced Query Optimization
  async optimizeQuery(query, params = []) {
    const startTime = Date.now();
    const queryHash = this.hashQuery(query);
    
    try {
      // Check if query result is cached
      const cacheKey = `query:${queryHash}:${JSON.stringify(params)}`;
      const cachedResult = await redis.cache.get(cacheKey);
      
      if (cachedResult) {
        this.metrics.cacheHitRatio.hits++;
        this.recordQueryTime(queryHash, Date.now() - startTime);
        return cachedResult;
      }
      
      // Execute query with connection pooling
      const result = await pgPool.query(query, params);
      
      // Cache result for frequently accessed queries
      if (this.shouldCacheQuery(query)) {
        const ttl = this.getCacheTTL(query);
        await redis.cache.set(cacheKey, result.rows, ttl);
      }
      
      this.metrics.cacheHitRatio.misses++;
      this.recordQueryTime(queryHash, Date.now() - startTime);
      
      return result.rows;
    } catch (error) {
      console.error('Query optimization error:', error);
      throw error;
    }
  }

  // Multi-level Caching Strategy
  async getWithMultiLevelCache(key, fetchFunction, options = {}) {
    const {
      l1TTL = 60,      // Level 1 cache (in-memory) - 1 minute
      l2TTL = 3600,    // Level 2 cache (Redis) - 1 hour
      l3TTL = 86400    // Level 3 cache (persistent) - 24 hours
    } = options;
    
    // Level 1: In-memory cache
    if (this.memoryCache && this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
      this.memoryCache.delete(key);
    }
    
    // Level 2: Redis cache
    const redisResult = await redis.cache.get(`l2:${key}`);
    if (redisResult) {
      // Store in L1 cache
      this.setMemoryCache(key, redisResult, l1TTL);
      return redisResult;
    }
    
    // Level 3: Database/API call
    const freshData = await fetchFunction();
    
    // Store in all cache levels
    this.setMemoryCache(key, freshData, l1TTL);
    await redis.cache.set(`l2:${key}`, freshData, l2TTL);
    await redis.cache.set(`l3:${key}`, freshData, l3TTL);
    
    return freshData;
  }

  // Connection Pool Optimization
  async optimizeConnectionPool() {
    const poolStats = {
      totalCount: pgPool.totalCount,
      idleCount: pgPool.idleCount,
      waitingCount: pgPool.waitingCount
    };
    
    this.metrics.connectionPoolStats = poolStats;
    
    // Auto-scale connection pool based on load
    const utilizationRatio = (poolStats.totalCount - poolStats.idleCount) / poolStats.totalCount;
    
    if (utilizationRatio > 0.8 && poolStats.totalCount < 50) {
      // Increase pool size if utilization is high
      console.log('High connection pool utilization detected, consider scaling up');
      this.emit('poolScaleUp', { currentSize: poolStats.totalCount, utilization: utilizationRatio });
    } else if (utilizationRatio < 0.3 && poolStats.totalCount > 10) {
      // Decrease pool size if utilization is low
      console.log('Low connection pool utilization detected, consider scaling down');
      this.emit('poolScaleDown', { currentSize: poolStats.totalCount, utilization: utilizationRatio });
    }
    
    return poolStats;
  }

  // Memory Management and Optimization
  async optimizeMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage;
    
    // Trigger garbage collection if memory usage is high
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const heapUtilization = heapUsedMB / heapTotalMB;
    
    if (heapUtilization > 0.85) {
      console.log('High memory utilization detected:', heapUtilization);
      
      // Clear old cache entries
      await this.clearOldCacheEntries();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Garbage collection triggered');
      }
      
      this.emit('memoryPressure', { utilization: heapUtilization, heapUsedMB });
    }
    
    return {
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      utilization: Math.round(heapUtilization * 100)
    };
  }

  // Database Index Optimization
  async analyzeAndOptimizeIndexes() {
    const indexAnalysis = [];
    
    try {
      // Analyze slow queries
      const slowQueries = await pgPool.query(`
        SELECT query, mean_time, calls, total_time
        FROM pg_stat_statements 
        WHERE mean_time > 100 
        ORDER BY mean_time DESC 
        LIMIT 10
      `);
      
      // Check index usage
      const indexUsage = await pgPool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan < 100
        ORDER BY idx_scan ASC
      `);
      
      // Identify missing indexes
      const missingIndexes = await pgPool.query(`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          seq_tup_read / seq_scan as avg_seq_read
        FROM pg_stat_user_tables 
        WHERE seq_scan > 1000 AND seq_tup_read / seq_scan > 1000
        ORDER BY seq_tup_read DESC
      `);
      
      indexAnalysis.push({
        slowQueries: slowQueries.rows,
        underutilizedIndexes: indexUsage.rows,
        potentialMissingIndexes: missingIndexes.rows
      });
      
      return indexAnalysis;
    } catch (error) {
      console.error('Index analysis error:', error);
      return [];
    }
  }

  // Cache Warming Strategy
  async warmCache() {
    console.log('Starting cache warming process...');
    
    const warmingTasks = [
      // Warm frequently accessed trading pairs
      this.warmTradingPairsCache(),
      // Warm user balances for active users
      this.warmActiveUserBalances(),
      // Warm market data
      this.warmMarketDataCache(),
      // Warm order book snapshots
      this.warmOrderBookCache()
    ];
    
    try {
      await Promise.all(warmingTasks);
      console.log('Cache warming completed successfully');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Performance Monitoring and Alerting
  async monitorPerformance() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        connectionPool: await this.optimizeConnectionPool(),
        memory: await this.optimizeMemoryUsage(),
        cache: this.getCacheMetrics(),
        queries: this.getQueryMetrics(),
        system: this.getSystemMetrics()
      };
      
      // Store metrics in Redis for monitoring dashboard
      try {
        await redis.cache.set('performance:metrics', metrics, 300); // 5 minutes
      } catch (redisError) {
        console.error('Redis cache error in monitorPerformance:', redisError);
      }
      
      // Check for performance alerts
      this.checkPerformanceAlerts(metrics);
      
      return metrics;
    } catch (error) {
      console.error('Performance monitoring error:', error);
      throw error;
    }
  }

  // Helper Methods
  hashQuery(query) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(query).digest('hex');
  }

  shouldCacheQuery(query) {
    const cacheablePatterns = [
      /SELECT.*FROM.*trading_pairs/i,
      /SELECT.*FROM.*users.*WHERE.*id/i,
      /SELECT.*FROM.*balances/i,
      /SELECT.*FROM.*market_data/i
    ];
    
    return cacheablePatterns.some(pattern => pattern.test(query));
  }

  getCacheTTL(query) {
    if (query.includes('trading_pairs')) return 3600; // 1 hour
    if (query.includes('market_data')) return 60;    // 1 minute
    if (query.includes('user_balances')) return 300;      // 5 minutes
    return 1800; // 30 minutes default
  }

  recordQueryTime(queryHash, duration) {
    if (!this.metrics.queryTimes.has(queryHash)) {
      this.metrics.queryTimes.set(queryHash, []);
    }
    
    const times = this.metrics.queryTimes.get(queryHash);
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  setMemoryCache(key, data, ttlSeconds) {
    if (!this.memoryCache) {
      this.memoryCache = new Map();
    }
    
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
    
    // Limit memory cache size
    if (this.memoryCache.size > 1000) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
  }

  async clearOldCacheEntries() {
    // Clear expired memory cache entries
    if (this.memoryCache) {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expires < now) {
          this.memoryCache.delete(key);
        }
      }
    }
    
    // Clear old Redis cache entries (implement LRU eviction)
    const keys = await redis.client.keys('query:*');
    if (keys.length > 10000) {
      const oldKeys = keys.slice(0, 1000);
      await redis.client.del(...oldKeys);
    }
  }

  async warmTradingPairsCache() {
    const query = 'SELECT * FROM trading_pairs WHERE is_active = true';
    await this.optimizeQuery(query);
  }

  async warmActiveUserBalances() {
    const query = `
      SELECT b.* FROM user_balances b 
      JOIN users u ON b.user_id = u.id 
      WHERE u.last_login > NOW() - INTERVAL '24 hours'
    `;
    await this.optimizeQuery(query);
  }

  async warmMarketDataCache() {
    const query = `
      SELECT * FROM market_data 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
    `;
    await this.optimizeQuery(query);
  }

  async warmOrderBookCache() {
    const query = `
      SELECT * FROM order_book_snapshots 
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `;
    await this.optimizeQuery(query);
  }

  getCacheMetrics() {
    const total = this.metrics.cacheHitRatio.hits + this.metrics.cacheHitRatio.misses;
    const hitRatio = total > 0 ? (this.metrics.cacheHitRatio.hits / total) * 100 : 0;
    
    return {
      hitRatio: Math.round(hitRatio * 100) / 100,
      hits: this.metrics.cacheHitRatio.hits,
      misses: this.metrics.cacheHitRatio.misses,
      memoryCache: this.memoryCache ? this.memoryCache.size : 0
    };
  }

  getQueryMetrics() {
    const allTimes = [];
    for (const times of this.metrics.queryTimes.values()) {
      allTimes.push(...times);
    }
    
    if (allTimes.length === 0) return { avgTime: 0, p95Time: 0, totalQueries: 0 };
    
    allTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(allTimes.length * 0.95);
    
    return {
      avgTime: Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length),
      p95Time: allTimes[p95Index] || 0,
      totalQueries: allTimes.length
    };
  }

  getSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    return {
      uptime: Math.round(process.uptime()),
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
      nodeVersion: process.version
    };
  }

  checkPerformanceAlerts(metrics) {
    // Memory usage alert
    if (metrics.memory.utilization > 85) {
      this.emit('alert', {
        type: 'memory',
        severity: 'high',
        message: `Memory utilization is ${metrics.memory.utilization}%`,
        metrics: metrics.memory
      });
    }
    
    // Cache hit ratio alert
    if (metrics.cache.hitRatio < 80) {
      this.emit('alert', {
        type: 'cache',
        severity: 'medium',
        message: `Cache hit ratio is ${metrics.cache.hitRatio}%`,
        metrics: metrics.cache
      });
    }
    
    // Query performance alert
    if (metrics.queries.p95Time > 1000) {
      this.emit('alert', {
        type: 'query',
        severity: 'high',
        message: `95th percentile query time is ${metrics.queries.p95Time}ms`,
        metrics: metrics.queries
      });
    }
  }

  startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.monitorPerformance();
      } catch (error) {
        console.error('Metrics collection error:', error);
      }
    }, 30000);
    
    // Warm cache every hour
    setInterval(async () => {
      try {
        await this.warmCache();
      } catch (error) {
        console.error('Cache warming error:', error);
      }
    }, 3600000);
  }
}

module.exports = new PerformanceService();