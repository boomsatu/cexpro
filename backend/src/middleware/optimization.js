const compression = require('compression');
const helmet = require('helmet');
const redis = require('../config/redis');
const performanceService = require('../services/performanceService');

class OptimizationMiddleware {
  constructor() {
    this.requestCache = new Map();
    this.responseCache = new Map();
    this.compressionStats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalSavings: 0
    };
  }

  // Response Compression Middleware
  compressionMiddleware() {
    return compression({
      // Compression level (1-9, 6 is default)
      level: 6,
      
      // Minimum response size to compress (in bytes)
      threshold: 1024,
      
      // Custom filter function
      filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }
        
        // Don't compress images, videos, or already compressed files
        const contentType = res.getHeader('content-type');
        if (contentType) {
          const nonCompressible = [
            'image/',
            'video/',
            'audio/',
            'application/zip',
            'application/gzip',
            'application/x-rar'
          ];
          
          if (nonCompressible.some(type => contentType.includes(type))) {
            return false;
          }
        }
        
        // Use default compression filter
        return compression.filter(req, res);
      },
      
      // Custom compression function
      chunkSize: 16 * 1024, // 16KB chunks
      windowBits: 15,
      memLevel: 8
    });
  }

  // Request Optimization Middleware
  requestOptimization() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Add request ID for tracking
      req.requestId = this.generateRequestId();
      
      // Set optimization headers
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Powered-By', 'CEX-Engine');
      
      // Enable keep-alive
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=5, max=1000');
      
      // Optimize based on request type
      await this.optimizeByRequestType(req, res);
      
      // Track request metrics
      this.trackRequestMetrics(req, startTime);
      
      next();
    };
  }

  // Response Caching Middleware
  responseCaching() {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      const cacheKey = this.generateCacheKey(req);
      
      // Check if response is cached
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', cached.contentType);
        return res.send(cached.data);
      }
      
      // Intercept response to cache it
      const originalSend = res.send;
      res.send = async (data) => {
        // Cache successful responses
        if (res.statusCode === 200 && this.shouldCacheResponse(req)) {
          await this.cacheResponse(cacheKey, {
            data,
            contentType: res.getHeader('content-type'),
            timestamp: Date.now()
          });
        }
        
        res.setHeader('X-Cache', 'MISS');
        originalSend.call(res, data);
      };
      
      next();
    };
  }

  // ETags for Client-Side Caching
  etagMiddleware() {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = (data) => {
        if (res.statusCode === 200 && typeof data === 'string') {
          const etag = this.generateETag(data);
          res.setHeader('ETag', etag);
          
          // Check if client has cached version
          const clientETag = req.headers['if-none-match'];
          if (clientETag === etag) {
            res.status(304).end();
            return;
          }
        }
        
        originalSend.call(res, data);
      };
      
      next();
    };
  }

  // Request Deduplication
  requestDeduplication() {
    return async (req, res, next) => {
      // Only deduplicate GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      const requestKey = this.generateRequestKey(req);
      
      // Check if same request is already being processed
      if (this.requestCache.has(requestKey)) {
        const existingRequest = this.requestCache.get(requestKey);
        
        // Wait for existing request to complete
        try {
          const result = await existingRequest.promise;
          res.setHeader('X-Deduplicated', 'true');
          return res.json(result);
        } catch (error) {
          // If existing request failed, continue with new request
        }
      }
      
      // Create promise for this request
      let resolveRequest, rejectRequest;
      const requestPromise = new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      });
      
      this.requestCache.set(requestKey, {
        promise: requestPromise,
        timestamp: Date.now()
      });
      
      // Intercept response to resolve promise
      const originalJson = res.json;
      res.json = (data) => {
        resolveRequest(data);
        this.requestCache.delete(requestKey);
        originalJson.call(res, data);
      };
      
      // Handle errors
      res.on('error', (error) => {
        rejectRequest(error);
        this.requestCache.delete(requestKey);
      });
      
      next();
    };
  }

  // Resource Hints Middleware
  resourceHints() {
    return (req, res, next) => {
      // Add resource hints for better performance
      res.setHeader('Link', [
        '</api/v1/trading/pairs>; rel=prefetch',
        '</api/v1/market/ticker>; rel=prefetch',
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/main.js>; rel=preload; as=script'
      ].join(', '));
      
      next();
    };
  }

  // Request Size Optimization
  requestSizeOptimization() {
    return (req, res, next) => {
      // Limit request size
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (req.headers['content-length'] && 
          parseInt(req.headers['content-length']) > maxSize) {
        return res.status(413).json({
          error: 'Request too large',
          maxSize: '10MB'
        });
      }
      
      // Enable request compression
      if (req.headers['content-encoding'] === 'gzip') {
        req.pipe(require('zlib').createGunzip()).pipe(req);
      }
      
      next();
    };
  }

  // Database Query Optimization Middleware
  queryOptimization() {
    return async (req, res, next) => {
      // Add query optimization context
      req.queryOptions = {
        useCache: this.shouldUseCache(req),
        cacheTTL: this.getCacheTTL(req),
        usePreparedStatement: this.shouldUsePreparedStatement(req),
        timeout: this.getQueryTimeout(req)
      };
      
      next();
    };
  }

  // Memory Usage Optimization
  memoryOptimization() {
    return (req, res, next) => {
      // Monitor memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      // If memory usage is high, enable aggressive optimization
      if (heapUsedMB > 500) { // 500MB threshold
        req.aggressiveOptimization = true;
        
        // Reduce cache TTL
        req.reducedCacheTTL = true;
        
        // Enable response streaming for large responses
        req.enableStreaming = true;
      }
      
      next();
    };
  }

  // Response Streaming for Large Data
  responseStreaming() {
    return (req, res, next) => {
      if (req.enableStreaming) {
        const originalJson = res.json;
        
        res.json = (data) => {
          if (typeof data === 'object' && JSON.stringify(data).length > 100000) {
            // Stream large responses
            res.setHeader('Content-Type', 'application/json');
            res.write('[');
            
            if (Array.isArray(data)) {
              data.forEach((item, index) => {
                if (index > 0) res.write(',');
                res.write(JSON.stringify(item));
              });
            } else {
              res.write(JSON.stringify(data));
            }
            
            res.write(']');
            res.end();
            return;
          }
          
          originalJson.call(res, data);
        };
      }
      
      next();
    };
  }

  // Helper Methods
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  generateCacheKey(req) {
    const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    return require('crypto').createHash('md5').update(key).digest('hex');
  }

  generateRequestKey(req) {
    return `${req.method}:${req.originalUrl}:${req.ip}`;
  }

  generateETag(data) {
    return require('crypto').createHash('md5').update(data).digest('hex');
  }

  async getCachedResponse(key) {
    try {
      const cached = await redis.cache.get(`response:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async cacheResponse(key, data) {
    try {
      const ttl = this.getResponseCacheTTL(key);
      await redis.cache.set(`response:${key}`, JSON.stringify(data), ttl);
    } catch (error) {
      console.error('Response caching error:', error);
    }
  }

  shouldCacheResponse(req) {
    const cacheableRoutes = [
      '/api/v1/trading/pairs',
      '/api/v1/market/ticker',
      '/api/v1/market/depth',
      '/api/v1/market/trades'
    ];
    
    return cacheableRoutes.some(route => req.path.startsWith(route));
  }

  getResponseCacheTTL(key) {
    if (key.includes('ticker')) return 5; // 5 seconds for ticker
    if (key.includes('pairs')) return 3600; // 1 hour for trading pairs
    if (key.includes('depth')) return 1; // 1 second for order book
    return 60; // 1 minute default
  }

  shouldUseCache(req) {
    return req.method === 'GET' && !req.headers['cache-control']?.includes('no-cache');
  }

  getCacheTTL(req) {
    if (req.reducedCacheTTL) return 30; // Reduced TTL under memory pressure
    if (req.path.includes('realtime')) return 1;
    if (req.path.includes('market')) return 5;
    return 300; // 5 minutes default
  }

  shouldUsePreparedStatement(req) {
    return req.method === 'GET' && req.query && Object.keys(req.query).length > 0;
  }

  getQueryTimeout(req) {
    if (req.aggressiveOptimization) return 5000; // 5 seconds under pressure
    if (req.path.includes('report')) return 60000; // 1 minute for reports
    return 30000; // 30 seconds default
  }

  async optimizeByRequestType(req, res) {
    // Trading requests - highest priority
    if (req.path.includes('/trading/')) {
      res.setHeader('X-Priority', 'high');
      req.queryTimeout = 5000;
    }
    
    // Market data requests - medium priority
    else if (req.path.includes('/market/')) {
      res.setHeader('X-Priority', 'medium');
      req.queryTimeout = 10000;
    }
    
    // Admin requests - low priority
    else if (req.path.includes('/admin/')) {
      res.setHeader('X-Priority', 'low');
      req.queryTimeout = 30000;
    }
  }

  trackRequestMetrics(req, startTime) {
    const duration = Date.now() - startTime;
    
    // Track compression stats
    this.compressionStats.totalRequests++;
    if (req.headers['accept-encoding']?.includes('gzip')) {
      this.compressionStats.compressedRequests++;
    }
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  }

  // Cleanup old cache entries
  async cleanupCache() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    // Cleanup request cache
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }
    
    // Cleanup response cache
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.responseCache.delete(key);
      }
    }
  }

  // Get optimization statistics
  getStats() {
    return {
      compression: this.compressionStats,
      requestCache: {
        size: this.requestCache.size,
        hitRatio: 0 // Would calculate from actual usage
      },
      responseCache: {
        size: this.responseCache.size,
        hitRatio: 0 // Would calculate from actual usage
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
  }

  // Initialize optimization middleware
  initialize() {
    // Cleanup cache every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    console.log('Optimization middleware initialized');
  }
}

module.exports = new OptimizationMiddleware();