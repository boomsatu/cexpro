const redis = require('../config/redis');
const crypto = require('crypto');

/**
 * Rate limiting middleware dengan konfigurasi yang fleksibel
 * Mendukung rate limiting berdasarkan IP, user, atau kombinasi keduanya
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.max = options.max || 100; // 100 requests default
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.message = options.message || 'Too many requests, please try again later.';
    this.standardHeaders = options.standardHeaders !== false;
    this.legacyHeaders = options.legacyHeaders !== false;
    this.store = options.store || 'redis';
  }

  // Default key generator menggunakan IP address
  defaultKeyGenerator(req) {
    return req.ip || req.connection.remoteAddress;
  }

  // Key generator untuk user-based rate limiting
  userKeyGenerator(req) {
    if (req.user) {
      return `user:${req.user.id}`;
    }
    return req.ip || req.connection.remoteAddress;
  }

  // Key generator untuk kombinasi IP dan user
  combinedKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress;
    if (req.user) {
      return `${ip}:user:${req.user.id}`;
    }
    return ip;
  }

  // Get current count from Redis
  async getCurrentCount(key) {
    try {
      const count = await redis.cache.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Rate limit Redis error:', error);
      return 0;
    }
  }

  // Increment count in Redis
  async incrementCount(key) {
    try {
      const multi = redis.cache.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(this.windowMs / 1000));
      const results = await multi.exec();
      return results[0][1]; // Return the incremented value
    } catch (error) {
      console.error('Rate limit Redis increment error:', error);
      return 1;
    }
  }

  // Get TTL for the key
  async getTTL(key) {
    try {
      return await redis.cache.ttl(key);
    } catch (error) {
      console.error('Rate limit Redis TTL error:', error);
      return Math.ceil(this.windowMs / 1000);
    }
  }

  // Main middleware function
  middleware() {
    return async (req, res, next) => {
      try {
        const key = `rate_limit:${this.keyGenerator(req)}`;
        const current = await this.getCurrentCount(key);

        // Check if limit exceeded
        if (current >= this.max) {
          const ttl = await this.getTTL(key);
          const resetTime = new Date(Date.now() + (ttl * 1000));

          // Set headers
          if (this.standardHeaders) {
            res.set('RateLimit-Limit', this.max);
            res.set('RateLimit-Remaining', 0);
            res.set('RateLimit-Reset', resetTime.toISOString());
          }

          if (this.legacyHeaders) {
            res.set('X-RateLimit-Limit', this.max);
            res.set('X-RateLimit-Remaining', 0);
            res.set('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
          }

          res.set('Retry-After', ttl);

          return res.status(429).json({
            success: false,
            message: this.message,
            retryAfter: ttl,
            resetTime: resetTime.toISOString()
          });
        }

        // Increment counter
        const newCount = await this.incrementCount(key);
        const remaining = Math.max(0, this.max - newCount);
        const ttl = await this.getTTL(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        // Set headers
        if (this.standardHeaders) {
          res.set('RateLimit-Limit', this.max);
          res.set('RateLimit-Remaining', remaining);
          res.set('RateLimit-Reset', resetTime.toISOString());
        }

        if (this.legacyHeaders) {
          res.set('X-RateLimit-Limit', this.max);
          res.set('X-RateLimit-Remaining', remaining);
          res.set('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
        }

        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // On error, allow the request to proceed
        next();
      }
    };
  }
}

/**
 * Factory function untuk membuat rate limiter
 */
const createRateLimiter = (options) => {
  const limiter = new RateLimiter(options);
  return limiter.middleware();
};

/**
 * Predefined rate limiters untuk berbagai use case
 */

// General API rate limiter
const apiRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: 'Too many API requests, please try again later.'
});

// Authentication rate limiter
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const identifier = req.body.email || req.body.username || 'unknown';
    return `auth:${ip}:${identifier}`;
  }
});

// Trading rate limiter (per user)
const tradingRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100, // 100 trading requests per minute per user
  message: 'Too many trading requests, please slow down.',
  keyGenerator: (req) => {
    if (req.user) {
      return `trading:user:${req.user.id}`;
    }
    return `trading:ip:${req.ip || req.connection.remoteAddress}`;
  }
});

// Order placement rate limiter (stricter)
const orderRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 50, // 50 orders per minute per user
  message: 'Too many order requests, please slow down.',
  keyGenerator: (req) => {
    if (req.user) {
      return `orders:user:${req.user.id}`;
    }
    return `orders:ip:${req.ip || req.connection.remoteAddress}`;
  }
});

// Market data rate limiter (more lenient)
const marketDataRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 600, // 600 requests per minute
  message: 'Too many market data requests, please slow down.'
});

// WebSocket connection rate limiter
const wsConnectionRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 10, // 10 connections per minute per IP
  message: 'Too many WebSocket connection attempts, please try again later.'
});

// Admin API rate limiter
const adminRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 200, // 200 requests per minute
  message: 'Too many admin requests, please slow down.',
  keyGenerator: (req) => {
    if (req.user) {
      return `admin:user:${req.user.id}`;
    }
    return `admin:ip:${req.ip || req.connection.remoteAddress}`;
  }
});

// Withdrawal rate limiter (very strict)
const withdrawalRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 5, // 5 withdrawal requests per minute per user
  message: 'Too many withdrawal requests, please wait before trying again.',
  keyGenerator: (req) => {
    if (req.user) {
      return `withdrawal:user:${req.user.id}`;
    }
    return `withdrawal:ip:${req.ip || req.connection.remoteAddress}`;
  }
});

// Password reset rate limiter
const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later.',
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body.email || 'unknown';
    return `password_reset:${ip}:${email}`;
  }
});

// 2FA verification rate limiter
const twoFARateLimit = createRateLimiter({
  windowMs: 5 * 60000, // 5 minutes
  max: 5, // 5 attempts per 5 minutes
  message: 'Too many 2FA verification attempts, please try again later.',
  keyGenerator: (req) => {
    if (req.user) {
      return `2fa:user:${req.user.id}`;
    }
    return `2fa:ip:${req.ip || req.connection.remoteAddress}`;
  }
});

module.exports = {
  RateLimiter,
  createRateLimiter,
  apiRateLimit,
  authRateLimit,
  tradingRateLimit,
  orderRateLimit,
  marketDataRateLimit,
  wsConnectionRateLimit,
  adminRateLimit,
  withdrawalRateLimit,
  passwordResetRateLimit,
  twoFARateLimit
};