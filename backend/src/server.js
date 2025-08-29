require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const expressWinston = require('express-winston');

// Import configurations
const { connectDB } = require('./config/database');
const { client: redis, cache, session: redisSession } = require('./config/redis');
const { cleanupExpiredTokens } = require('./config/jwt');

// Import middleware
const { optionalAuth } = require('./middleware/auth');
const loadBalancer = require('./middleware/loadBalancer');
const optimization = require('./middleware/optimization');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tradingRoutes = require('./routes/trading');
const monitoringRoutes = require('./routes/monitoring');
const adminRoutes = require('./routes/adminRoutes');

// Import services
const { createAuditLog, EVENT_TYPES, LOG_LEVELS, RISK_LEVELS } = require('./services/auditService');
const performanceService = require('./services/performanceService');
const dbOptimization = require('./utils/dbOptimization');

// Import database models and functions
const { testConnection } = require('./models/index');

// Server startup timestamp: 2025-01-28 15:52:15
// Initialize Express app
const app = express();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cex-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS').split(','),
  allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With,Accept,Origin').split(',')
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Request logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: function (req, res) {
    return req.url === '/health' || req.url === '/metrics';
  }
}));

// Morgan for additional HTTP logging
app.use(morgan('combined', {
  skip: (req, res) => req.url === '/health' || req.url === '/metrics'
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting - DISABLED FOR DEVELOPMENT
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many requests from this IP, please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// app.use('/api/', limiter);

// Session configuration
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  name: process.env.SESSION_NAME || 'cex_session',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.SESSION_SECURE === 'true',
    httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
    sameSite: process.env.SESSION_SAME_SITE || 'lax'
  }
}));

// Add performance optimization middleware
app.use(optimization.compressionMiddleware());
app.use(optimization.requestOptimization());
app.use(optimization.responseCaching());
app.use(optimization.etagMiddleware());
app.use(optimization.requestDeduplication());
app.use(optimization.memoryOptimization());
app.use(optimization.queryOptimization());
app.use(loadBalancer.middleware());

// Add optional authentication to all routes
app.use(optionalAuth);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'checking...',
        redis: 'checking...',
        cache: 'checking...'
      }
    };

    // Check database connection
    try {
      await testConnection();
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      await redis.ping();
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Check cache
    try {
      await cache.set('health_check', 'ok', 'EX', 10);
      const result = await cache.get('health_check');
      health.services.cache = result === 'ok' ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.services.cache = 'unhealthy';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      activeConnections: req.socket.server._connections || 0,
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({
      error: 'Metrics collection failed'
    });
  }
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/trading', tradingRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/wallet', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Wallet API not implemented yet'
  });
});

// WebSocket proxy for real-time features
if (process.env.WS_PORT) {
  app.use('/ws', createProxyMiddleware({
    target: `ws://localhost:${process.env.WS_PORT}`,
    ws: true,
    changeOrigin: true,
    logLevel: 'warn'
  }));
}

// API documentation (Swagger) in development
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SWAGGER === 'true') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CEX Exchange API',
        version: '1.0.0',
        description: 'Cryptocurrency Exchange Platform API Documentation'
      },
      servers: [
        {
          url: process.env.APP_URL || 'http://localhost:3001',
          description: 'Development server'
        }
      ]
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js']
  };

  const specs = swaggerJsdoc(options);
  app.use(process.env.SWAGGER_PATH || '/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error logging middleware
app.use(expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} - {{err.message}}'
}));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log security-related errors
  if (err.message.includes('CORS') || err.message.includes('rate limit') || err.message.includes('authentication')) {
    createAuditLog({
      userId: req.user?.id || null,
      eventType: EVENT_TYPES.SECURITY_ALERT,
      level: LOG_LEVELS.WARNING,
      riskLevel: RISK_LEVELS.MEDIUM,
      description: `Security error: ${err.message}`,
      metadata: {
        error: err.message,
        url: req.url,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    }).catch(auditErr => {
      logger.error('Failed to create audit log:', auditErr);
    });
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDevelopment && {
      stack: err.stack,
      details: err
    }),
    timestamp: new Date().toISOString(),
    requestId: req.id || req.sessionID
  });
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await require('./config/database').closeConnections();
      logger.info('Database connections closed');
      
      // Close Redis connections
      await redis.quit();
      logger.info('Redis connections closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize server
async function startServer() {
  try {
    logger.info('Database connection established');
    
    // Connect and test Redis connection
    await redis.connect();
    await redis.ping();
    logger.info('Redis connection established');
    
    // Start cleanup tasks
    setInterval(async () => {
      try {
        await cleanupExpiredTokens();
      } catch (error) {
        logger.error('Token cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
    
    // Initialize performance monitoring with error handling to prevent unhandled rejection
    try {
      await performanceService.monitorPerformance();
      logger.info('Performance monitoring initialized');
    } catch (error) {
      logger.error('Performance monitoring initialization failed:', error);
    }
    
    // Initialize database optimization
    dbOptimization.initializeOptimizations();
    
    // Start server
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 CEX Exchange Backend Server running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SWAGGER === 'true') {
        logger.info(`📖 API Documentation: http://localhost:${PORT}${process.env.SWAGGER_PATH || '/api-docs'}`);
      }
      
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection at:', { 
    promise: promise.toString(), 
    reason: reason?.stack || reason?.message || reason 
  });
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.stack || error });
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };