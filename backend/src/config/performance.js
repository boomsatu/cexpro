const os = require('os');
const cluster = require('cluster');

// Performance Configuration
const performanceConfig = {
  // Database Connection Pool Settings
  database: {
    postgresql: {
      max: process.env.DB_POOL_MAX || 20,
      min: process.env.DB_POOL_MIN || 5,
      idle: process.env.DB_POOL_IDLE || 10000,
      acquire: process.env.DB_POOL_ACQUIRE || 60000,
      evict: process.env.DB_POOL_EVICT || 1000,
      handleDisconnects: true,
      maxUses: process.env.DB_POOL_MAX_USES || 7500
    },
    redis: {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxMemoryPolicy: 'allkeys-lru',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'cex:',
      db: process.env.REDIS_DB || 0
    }
  },

  // Caching Strategy Configuration
  cache: {
    levels: {
      l1: {
        name: 'memory',
        maxSize: 1000, // Max items in memory cache
        ttl: 60 // 1 minute
      },
      l2: {
        name: 'redis',
        ttl: 3600 // 1 hour
      },
      l3: {
        name: 'persistent',
        ttl: 86400 // 24 hours
      }
    },
    strategies: {
      trading_pairs: {
        level: 'l2',
        ttl: 3600,
        invalidateOn: ['trading_pair_update']
      },
      market_data: {
        level: 'l1',
        ttl: 5,
        invalidateOn: ['price_update']
      },
      user_balances: {
        level: 'l2',
        ttl: 300,
        invalidateOn: ['balance_update', 'trade_executed']
      },
      order_book: {
        level: 'l1',
        ttl: 1,
        invalidateOn: ['order_update']
      }
    }
  },

  // Query Optimization Settings
  queries: {
    timeout: {
      default: 30000, // 30 seconds
      trading: 5000,  // 5 seconds for trading operations
      reporting: 120000, // 2 minutes for reports
      admin: 60000    // 1 minute for admin operations
    },
    caching: {
      enabled: true,
      defaultTTL: 300, // 5 minutes
      maxCacheSize: 10000,
      patterns: {
        cacheable: [
          /SELECT.*FROM.*trading_pairs/i,
          /SELECT.*FROM.*users.*WHERE.*id/i,
          /SELECT.*FROM.*user_balances/i,
          /SELECT.*FROM.*market_data/i
        ],
        nonCacheable: [
          /INSERT/i,
          /UPDATE/i,
          /DELETE/i,
          /NOW\(\)/i,
          /CURRENT_TIMESTAMP/i
        ]
      }
    },
    preparedStatements: {
      enabled: true,
      maxStatements: 1000,
      cleanupInterval: 3600000 // 1 hour
    }
  },

  // Load Balancing Configuration
  loadBalancer: {
    strategy: process.env.LB_STRATEGY || 'adaptive', // round_robin, weighted, least_connections, response_time, adaptive
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3,
      path: '/health'
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000 // 10 seconds
    },
    rateLimit: {
      perServer: 1000, // requests per minute per server
      global: 5000     // total requests per minute
    }
  },

  // Memory Management
  memory: {
    heapSizeLimit: process.env.NODE_MAX_OLD_SPACE_SIZE || 4096, // MB
    gcThreshold: 0.85, // Trigger GC at 85% heap usage
    memoryLeakDetection: {
      enabled: true,
      checkInterval: 300000, // 5 minutes
      thresholdIncrease: 50 // MB increase threshold
    },
    cacheEviction: {
      strategy: 'lru',
      maxMemoryUsage: 0.8 // 80% of available memory
    }
  },

  // Compression Settings
  compression: {
    enabled: true,
    level: 6, // 1-9, 6 is default
    threshold: 1024, // Minimum size to compress (bytes)
    chunkSize: 16 * 1024, // 16KB chunks
    types: [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ]
  },

  // Monitoring and Alerting
  monitoring: {
    enabled: true,
    interval: 30000, // 30 seconds
    metrics: {
      responseTime: {
        p95Threshold: 1000, // ms
        p99Threshold: 2000  // ms
      },
      throughput: {
        minRPS: 10,  // requests per second
        maxRPS: 1000
      },
      errorRate: {
        threshold: 0.05 // 5%
      },
      memory: {
        heapUsageThreshold: 0.85, // 85%
        rssThreshold: 2048 // MB
      },
      cpu: {
        usageThreshold: 0.8 // 80%
      },
      database: {
        connectionPoolThreshold: 0.9, // 90% of max connections
        queryTimeThreshold: 1000, // ms
        slowQueryThreshold: 5000 // ms
      },
      cache: {
        hitRatioThreshold: 0.8, // 80%
        memoryUsageThreshold: 0.9 // 90%
      }
    },
    alerts: {
      channels: {
        console: true,
        redis: true,
        webhook: process.env.ALERT_WEBHOOK_URL || null,
        email: process.env.ALERT_EMAIL || null
      },
      severity: {
        low: {
          cooldown: 300000 // 5 minutes
        },
        medium: {
          cooldown: 180000 // 3 minutes
        },
        high: {
          cooldown: 60000 // 1 minute
        },
        critical: {
          cooldown: 30000 // 30 seconds
        }
      }
    }
  },

  // Auto-scaling Configuration
  autoScaling: {
    enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    metrics: {
      cpu: {
        scaleUpThreshold: 0.8,   // 80%
        scaleDownThreshold: 0.3, // 30%
        evaluationPeriods: 3     // Number of periods to evaluate
      },
      memory: {
        scaleUpThreshold: 0.85,  // 85%
        scaleDownThreshold: 0.5, // 50%
        evaluationPeriods: 3
      },
      connections: {
        scaleUpThreshold: 8000,
        scaleDownThreshold: 2000,
        evaluationPeriods: 2
      }
    },
    limits: {
      minInstances: 2,
      maxInstances: 20,
      cooldownPeriod: 300000 // 5 minutes
    }
  },

  // Cluster Configuration
  cluster: {
    enabled: process.env.CLUSTER_ENABLED === 'true',
    workers: process.env.CLUSTER_WORKERS || os.cpus().length,
    restartDelay: 1000, // ms
    maxRestarts: 10,
    gracefulShutdownTimeout: 30000 // 30 seconds
  },

  // Request Optimization
  requests: {
    keepAlive: {
      enabled: true,
      timeout: 5000,  // 5 seconds
      maxSockets: 1000
    },
    deduplication: {
      enabled: true,
      windowSize: 5000, // 5 seconds
      maxConcurrent: 100
    },
    prioritization: {
      enabled: true,
      queues: {
        high: {
          paths: ['/api/v1/trading'],
          maxConcurrent: 50,
          timeout: 5000
        },
        medium: {
          paths: ['/api/v1/market'],
          maxConcurrent: 100,
          timeout: 10000
        },
        low: {
          paths: ['/api/v1/admin'],
          maxConcurrent: 20,
          timeout: 30000
        }
      }
    }
  },

  // Response Optimization
  responses: {
    caching: {
      enabled: true,
      defaultTTL: 300, // 5 minutes
      maxSize: 100 * 1024 * 1024, // 100MB
      strategies: {
        etag: true,
        lastModified: true,
        cacheControl: true
      }
    },
    streaming: {
      enabled: true,
      threshold: 100000, // 100KB
      chunkSize: 8192    // 8KB
    }
  },

  // Development vs Production Settings
  environment: {
    development: {
      monitoring: {
        interval: 60000, // 1 minute
        verboseLogging: true
      },
      cache: {
        ttl: 60 // Shorter TTL for development
      },
      alerts: {
        enabled: false
      }
    },
    production: {
      monitoring: {
        interval: 30000, // 30 seconds
        verboseLogging: false
      },
      cache: {
        ttl: 3600 // Longer TTL for production
      },
      alerts: {
        enabled: true
      }
    }
  }
};

// Get environment-specific configuration
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = { ...performanceConfig };
  
  // Apply environment-specific overrides
  if (performanceConfig.environment[env]) {
    const envConfig = performanceConfig.environment[env];
    
    // Deep merge environment config
    Object.keys(envConfig).forEach(key => {
      if (typeof envConfig[key] === 'object' && !Array.isArray(envConfig[key])) {
        baseConfig[key] = { ...baseConfig[key], ...envConfig[key] };
      } else {
        baseConfig[key] = envConfig[key];
      }
    });
  }
  
  return baseConfig;
}

// Validate configuration
function validateConfig(config) {
  const errors = [];
  
  // Validate database pool settings
  if (config.database.postgresql.max < config.database.postgresql.min) {
    errors.push('Database pool max must be greater than min');
  }
  
  // Validate memory settings
  if (config.memory.gcThreshold > 1 || config.memory.gcThreshold < 0) {
    errors.push('Memory GC threshold must be between 0 and 1');
  }
  
  // Validate monitoring thresholds
  if (config.monitoring.metrics.errorRate.threshold > 1) {
    errors.push('Error rate threshold must be between 0 and 1');
  }
  
  if (errors.length > 0) {
    throw new Error(`Performance configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

// Export configuration
const config = getConfig();
validateConfig(config);

module.exports = {
  config,
  getConfig,
  validateConfig,
  
  // Helper functions
  isDevelopment: () => (process.env.NODE_ENV || 'development') === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  
  // Get specific config sections
  getDatabaseConfig: () => config.database,
  getCacheConfig: () => config.cache,
  getMonitoringConfig: () => config.monitoring,
  getLoadBalancerConfig: () => config.loadBalancer,
  getMemoryConfig: () => config.memory,
  getCompressionConfig: () => config.compression,
  getAutoScalingConfig: () => config.autoScaling,
  getClusterConfig: () => config.cluster
};