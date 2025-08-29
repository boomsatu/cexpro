const { pgPool } = require('../config/database');
const redis = require('../config/redis');
const performanceService = require('../services/performanceService');

class DatabaseOptimization {
  constructor() {
    this.queryCache = new Map();
    this.preparedStatements = new Map();
    this.connectionStats = {
      totalQueries: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.initializeOptimizations();
  }

  // Advanced Query Optimization
  async optimizedQuery(sql, params = [], options = {}) {
    const {
      useCache = true,
      cacheTTL = 300,
      usePreparedStatement = true,
      timeout = 30000,
      priority = 'normal'
    } = options;
    
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(sql, params);
    
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.getCachedResult(queryHash);
        if (cached) {
          this.connectionStats.cacheHits++;
          return cached;
        }
        this.connectionStats.cacheMisses++;
      }
      
      // Use prepared statement if beneficial
      let result;
      if (usePreparedStatement && this.shouldUsePreparedStatement(sql)) {
        result = await this.executePreparedStatement(sql, params, timeout);
      } else {
        result = await this.executeQuery(sql, params, timeout);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Track slow queries
      if (executionTime > 1000) {
        this.connectionStats.slowQueries++;
        console.warn(`Slow query detected (${executionTime}ms):`, sql.substring(0, 100));
        await this.logSlowQuery(sql, params, executionTime);
      }
      
      // Cache result if appropriate
      if (useCache && this.shouldCacheQuery(sql)) {
        await this.cacheResult(queryHash, result.rows, cacheTTL);
      }
      
      this.connectionStats.totalQueries++;
      return result.rows;
      
    } catch (error) {
      console.error('Optimized query error:', error);
      throw error;
    }
  }

  // Batch Query Execution
  async batchQuery(queries, options = {}) {
    const { useTransaction = true, maxBatchSize = 100 } = options;
    
    if (queries.length === 0) return [];
    
    // Split into batches if too large
    const batches = [];
    for (let i = 0; i < queries.length; i += maxBatchSize) {
      batches.push(queries.slice(i, i + maxBatchSize));
    }
    
    const results = [];
    
    for (const batch of batches) {
      if (useTransaction) {
        const batchResult = await this.executeBatchTransaction(batch);
        results.push(...batchResult);
      } else {
        const batchPromises = batch.map(({ sql, params }) => 
          this.optimizedQuery(sql, params, { useCache: false })
        );
        const batchResult = await Promise.all(batchPromises);
        results.push(...batchResult);
      }
    }
    
    return results;
  }

  // Connection Pool Optimization
  async optimizeConnectionPool() {
    const poolInfo = {
      totalCount: pgPool.totalCount,
      idleCount: pgPool.idleCount,
      waitingCount: pgPool.waitingCount
    };
    
    // Monitor pool utilization
    const utilization = (poolInfo.totalCount - poolInfo.idleCount) / poolInfo.totalCount;
    
    if (utilization > 0.9) {
      console.warn('High connection pool utilization:', utilization);
      await this.handleHighUtilization();
    }
    
    if (poolInfo.waitingCount > 10) {
      console.warn('High connection queue:', poolInfo.waitingCount);
      await this.handleHighQueue();
    }
    
    return poolInfo;
  }

  // Read/Write Splitting
  async routeQuery(sql, params = [], options = {}) {
    const isReadQuery = this.isReadOnlyQuery(sql);
    const { forceWrite = false } = options;
    
    if (isReadQuery && !forceWrite) {
      // Route to read replica
      return await this.executeOnReadReplica(sql, params, options);
    } else {
      // Route to primary database
      return await this.executeOnPrimary(sql, params, options);
    }
  }

  // Query Plan Analysis
  async analyzeQueryPlan(sql, params = []) {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const result = await pgPool.query(explainQuery, params);
      
      const plan = result.rows[0]['QUERY PLAN'][0];
      const analysis = this.parseQueryPlan(plan);
      
      return {
        executionTime: plan['Execution Time'],
        planningTime: plan['Planning Time'],
        totalCost: plan.Plan['Total Cost'],
        recommendations: this.generateOptimizationRecommendations(analysis)
      };
      
    } catch (error) {
      console.error('Query plan analysis error:', error);
      return null;
    }
  }

  // Index Optimization
  async optimizeIndexes() {
    const recommendations = [];
    
    try {
      // Find unused indexes
      const unusedIndexes = await pgPool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes 
        WHERE idx_scan < 10
        ORDER BY idx_scan ASC
      `);
      
      recommendations.push({
        type: 'unused_indexes',
        data: unusedIndexes.rows,
        recommendation: 'Consider dropping these rarely used indexes'
      });
      
      // Find missing indexes for frequent queries
      const missingIndexes = await this.findMissingIndexes();
      recommendations.push({
        type: 'missing_indexes',
        data: missingIndexes,
        recommendation: 'Consider adding these indexes for better performance'
      });
      
      // Find duplicate indexes
      const duplicateIndexes = await this.findDuplicateIndexes();
      recommendations.push({
        type: 'duplicate_indexes',
        data: duplicateIndexes,
        recommendation: 'Consider removing duplicate indexes'
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Index optimization error:', error);
      return [];
    }
  }

  // Table Statistics Update
  async updateTableStatistics(tables = []) {
    try {
      if (tables.length === 0) {
        // Update all tables
        await pgPool.query('ANALYZE');
        console.log('Updated statistics for all tables');
      } else {
        // Update specific tables
        for (const table of tables) {
          await pgPool.query(`ANALYZE ${table}`);
          console.log(`Updated statistics for table: ${table}`);
        }
      }
    } catch (error) {
      console.error('Statistics update error:', error);
    }
  }

  // Vacuum and Maintenance
  async performMaintenance(options = {}) {
    const {
      vacuum = true,
      analyze = true,
      reindex = false,
      tables = []
    } = options;
    
    try {
      if (tables.length === 0) {
        // Maintenance on all tables
        if (vacuum) {
          await pgPool.query('VACUUM');
          console.log('Vacuum completed for all tables');
        }
        
        if (analyze) {
          await pgPool.query('ANALYZE');
          console.log('Analyze completed for all tables');
        }
        
        if (reindex) {
          await pgPool.query('REINDEX DATABASE CONCURRENTLY');
          console.log('Reindex completed for database');
        }
      } else {
        // Maintenance on specific tables
        for (const table of tables) {
          if (vacuum) {
            await pgPool.query(`VACUUM ${table}`);
          }
          if (analyze) {
            await pgPool.query(`ANALYZE ${table}`);
          }
          if (reindex) {
            await pgPool.query(`REINDEX TABLE ${table}`);
          }
          console.log(`Maintenance completed for table: ${table}`);
        }
      }
    } catch (error) {
      console.error('Maintenance error:', error);
    }
  }

  // Query Monitoring and Logging
  async monitorQueries() {
    try {
      // Get current running queries
      const runningQueries = await pgPool.query(`
        SELECT 
          pid,
          now() - pg_stat_activity.query_start AS duration,
          query,
          state
        FROM pg_stat_activity 
        WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
        AND state = 'active'
      `);
      
      // Check if pg_stat_statements extension is available
      let queryStats = { rows: [] };
      try {
        const extensionCheck = await pgPool.query(`
          SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        `);
        
        if (extensionCheck.rows.length > 0) {
          // Get query statistics only if extension is available
          queryStats = await pgPool.query(`
            SELECT 
              query,
              calls,
              total_time,
              mean_time,
              max_time,
              rows
            FROM pg_stat_statements 
            ORDER BY total_time DESC 
            LIMIT 20
          `);
        } else {
          console.log('pg_stat_statements extension not available, skipping query statistics');
        }
      } catch (extError) {
        console.log('pg_stat_statements not available:', extError.message);
      }
      
      return {
        longRunningQueries: runningQueries.rows,
        topQueries: queryStats.rows,
        connectionStats: this.connectionStats
      };
      
    } catch (error) {
      console.error('Query monitoring error:', error);
      return null;
    }
  }

  // Helper Methods
  generateQueryHash(sql, params) {
    const crypto = require('crypto');
    const content = sql + JSON.stringify(params);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async getCachedResult(queryHash) {
    try {
      const cached = await redis.cache.get(`query:${queryHash}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async cacheResult(queryHash, result, ttl) {
    try {
      await redis.cache.set(`query:${queryHash}`, JSON.stringify(result), ttl);
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  shouldUsePreparedStatement(sql) {
    // Use prepared statements for frequently executed queries
    const patterns = [
      /SELECT.*FROM.*WHERE.*\$\d+/i,
      /INSERT.*INTO.*VALUES.*\$\d+/i,
      /UPDATE.*SET.*WHERE.*\$\d+/i,
      /DELETE.*FROM.*WHERE.*\$\d+/i
    ];
    
    return patterns.some(pattern => pattern.test(sql));
  }

  shouldCacheQuery(sql) {
    const cacheablePatterns = [
      /SELECT.*FROM.*trading_pairs/i,
      /SELECT.*FROM.*market_data/i,
      /SELECT.*FROM.*users.*WHERE.*id/i
    ];
    
    const nonCacheablePatterns = [
      /INSERT/i,
      /UPDATE/i,
      /DELETE/i,
      /NOW\(\)/i,
      /CURRENT_TIMESTAMP/i
    ];
    
    return cacheablePatterns.some(pattern => pattern.test(sql)) &&
           !nonCacheablePatterns.some(pattern => pattern.test(sql));
  }

  async executePreparedStatement(sql, params, timeout) {
    const statementName = this.generateQueryHash(sql, []);
    
    if (!this.preparedStatements.has(statementName)) {
      await pgPool.query(`PREPARE ${statementName} AS ${sql}`);
      this.preparedStatements.set(statementName, true);
    }
    
    const client = await pgPool.connect();
    try {
      const result = await Promise.race([
        client.query(`EXECUTE ${statementName}`, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
      return result;
    } finally {
      client.release();
    }
  }

  async executeQuery(sql, params, timeout) {
    const client = await pgPool.connect();
    try {
      const result = await Promise.race([
        client.query(sql, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
      return result;
    } finally {
      client.release();
    }
  }

  async executeBatchTransaction(queries) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { sql, params } of queries) {
        const result = await client.query(sql, params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  isReadOnlyQuery(sql) {
    const readPatterns = [
      /^\s*SELECT/i,
      /^\s*WITH.*SELECT/i,
      /^\s*EXPLAIN/i
    ];
    
    return readPatterns.some(pattern => pattern.test(sql));
  }

  async executeOnReadReplica(sql, params, options) {
    // In a real implementation, this would connect to read replica
    return await this.optimizedQuery(sql, params, options);
  }

  async executeOnPrimary(sql, params, options) {
    return await this.optimizedQuery(sql, params, options);
  }

  parseQueryPlan(plan) {
    return {
      nodeType: plan.Plan['Node Type'],
      totalCost: plan.Plan['Total Cost'],
      actualTime: plan.Plan['Actual Total Time'],
      rows: plan.Plan['Actual Rows'],
      loops: plan.Plan['Actual Loops']
    };
  }

  generateOptimizationRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalCost > 10000) {
      recommendations.push('High cost query - consider adding indexes');
    }
    
    if (analysis.actualTime > 1000) {
      recommendations.push('Slow execution - review query structure');
    }
    
    if (analysis.rows > 100000) {
      recommendations.push('Large result set - consider pagination');
    }
    
    return recommendations;
  }

  async findMissingIndexes() {
    // Analyze query patterns to suggest missing indexes
    const suggestions = [];
    
    try {
      const frequentQueries = await pgPool.query(`
        SELECT 
          query,
          calls,
          mean_time
        FROM pg_stat_statements 
        WHERE calls > 100 AND mean_time > 100
        ORDER BY calls DESC
      `);
      
      // Simple heuristic for missing indexes
      for (const row of frequentQueries.rows) {
        const query = row.query;
        if (query.includes('WHERE') && !query.includes('INDEX')) {
          suggestions.push({
            query: query.substring(0, 100),
            calls: row.calls,
            meanTime: row.mean_time,
            suggestion: 'Consider adding index on WHERE clause columns'
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      return [];
    }
  }

  async findDuplicateIndexes() {
    try {
      const duplicates = await pgPool.query(`
        SELECT 
          t.tablename,
          array_agg(t.indexname) as duplicate_indexes
        FROM (
          SELECT 
            tablename,
            indexname,
            array_to_string(array_agg(attname), ',') as columns
          FROM pg_indexes 
          JOIN pg_index ON pg_indexes.indexname = pg_index.indexrelid::regclass::text
          JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid 
            AND pg_attribute.attnum = ANY(pg_index.indkey)
          GROUP BY tablename, indexname
        ) t
        GROUP BY t.tablename, t.columns
        HAVING count(*) > 1
      `);
      
      return duplicates.rows;
    } catch (error) {
      return [];
    }
  }

  async handleHighUtilization() {
    console.log('Handling high connection pool utilization');
    // Could implement connection pool scaling here
  }

  async handleHighQueue() {
    console.log('Handling high connection queue');
    // Could implement queue management strategies here
  }

  async logSlowQuery(sql, params, executionTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sql: sql.substring(0, 500),
      params: JSON.stringify(params),
      executionTime,
      type: 'slow_query'
    };
    
    await redis.cache.lpush('slow_queries', JSON.stringify(logEntry));
    await redis.cache.ltrim('slow_queries', 0, 999); // Keep last 1000 entries
  }

  initializeOptimizations() {
    // Clean up prepared statements periodically
    setInterval(() => {
      this.preparedStatements.clear();
    }, 3600000); // Every hour
    
    // Monitor and log statistics with error handling to prevent unhandled rejection
    setInterval(async () => {
      try {
        const stats = await this.monitorQueries();
        if (stats) {
          console.log('Database stats:', {
            connectionStats: this.connectionStats,
            longRunningQueries: stats.longRunningQueries.length
          });
        }
      } catch (error) {
        console.error('Database monitoring error:', error);
        // Continue without crashing to prevent unhandled rejection
      }
    }, 300000); // Every 5 minutes
  }

  getOptimizationStats() {
    return {
      ...this.connectionStats,
      cacheSize: this.queryCache.size,
      preparedStatements: this.preparedStatements.size,
      cacheHitRatio: this.connectionStats.cacheHits / 
        (this.connectionStats.cacheHits + this.connectionStats.cacheMisses) * 100
    };
  }
}

module.exports = new DatabaseOptimization();