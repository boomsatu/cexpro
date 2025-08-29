const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { cache } = require('./redis');

// JWT Configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex'),
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex'),
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  ISSUER: process.env.JWT_ISSUER || 'cex-exchange',
  AUDIENCE: process.env.JWT_AUDIENCE || 'cex-users'
};

// Token blacklist key prefixes
const BLACKLIST_PREFIX = 'jwt_blacklist:';
const REFRESH_BLACKLIST_PREFIX = 'refresh_blacklist:';
const USER_TOKENS_PREFIX = 'user_tokens:';

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role
 * @param {Object} options - Additional options
 * @returns {string} JWT access token
 */
function generateAccessToken(payload, options = {}) {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID() // JWT ID for tracking
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    issuer: JWT_CONFIG.ISSUER,
    audience: JWT_CONFIG.AUDIENCE,
    subject: payload.userId.toString(),
    ...options
  };

  return jwt.sign(tokenPayload, JWT_CONFIG.ACCESS_TOKEN_SECRET, tokenOptions);
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.sessionId - Session ID
 * @param {Object} options - Additional options
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload, options = {}) {
  const tokenPayload = {
    userId: payload.userId,
    sessionId: payload.sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID()
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    issuer: JWT_CONFIG.ISSUER,
    audience: JWT_CONFIG.AUDIENCE,
    subject: payload.userId.toString(),
    ...options
  };

  return jwt.sign(tokenPayload, JWT_CONFIG.REFRESH_TOKEN_SECRET, tokenOptions);
}

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @param {string} sessionId - Session ID
 * @param {Object} options - Additional options
 * @returns {Object} Token pair
 */
async function generateTokenPair(user, sessionId, options = {}) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const refreshPayload = {
    userId: user.id,
    sessionId
  };

  const accessToken = generateAccessToken(payload, options.access);
  const refreshToken = generateRefreshToken(refreshPayload, options.refresh);

  // Store refresh token in Redis for tracking
  const refreshTokenKey = `${USER_TOKENS_PREFIX}${user.id}:${sessionId}`;
  const refreshTokenData = {
    token: refreshToken,
    createdAt: new Date().toISOString(),
    userAgent: options.userAgent,
    ipAddress: options.ipAddress
  };

  // Set expiry to match refresh token expiry
  const expirySeconds = getTokenExpirySeconds(JWT_CONFIG.REFRESH_TOKEN_EXPIRY);
  await cache.setex(refreshTokenKey, expirySeconds, JSON.stringify(refreshTokenData));

  return {
    accessToken,
    refreshToken,
    expiresIn: getTokenExpirySeconds(JWT_CONFIG.ACCESS_TOKEN_EXPIRY)
  };
}

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 */
async function verifyAccessToken(token, options = {}) {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    const verifyOptions = {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
      ...options
    };

    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET, verifyOptions);
    
    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Access token not active yet');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 */
async function verifyRefreshToken(token, options = {}) {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await isRefreshTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    const verifyOptions = {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
      ...options
    };

    const decoded = jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET, verifyOptions);
    
    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Verify token exists in Redis
    const refreshTokenKey = `${USER_TOKENS_PREFIX}${decoded.userId}:${decoded.sessionId}`;
    const storedTokenData = await cache.get(refreshTokenKey);
    
    if (!storedTokenData) {
      throw new Error('Refresh token not found or expired');
    }

    const tokenData = JSON.parse(storedTokenData);
    if (tokenData.token !== token) {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Refresh token not active yet');
    }
    throw error;
  }
}

/**
 * Blacklist access token
 * @param {string} token - JWT access token
 * @returns {Promise<void>}
 */
async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      throw new Error('Invalid token format');
    }

    const blacklistKey = `${BLACKLIST_PREFIX}${decoded.jti}`;
    const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiryTime > 0) {
      await cache.setex(blacklistKey, expiryTime, 'blacklisted');
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw error;
  }
}

/**
 * Blacklist refresh token
 * @param {string} token - JWT refresh token
 * @returns {Promise<void>}
 */
async function blacklistRefreshToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      throw new Error('Invalid token format');
    }

    const blacklistKey = `${REFRESH_BLACKLIST_PREFIX}${decoded.jti}`;
    const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiryTime > 0) {
      await cache.setex(blacklistKey, expiryTime, 'blacklisted');
    }

    // Also remove from user tokens
    if (decoded.userId && decoded.sessionId) {
      const refreshTokenKey = `${USER_TOKENS_PREFIX}${decoded.userId}:${decoded.sessionId}`;
      await cache.del(refreshTokenKey);
    }
  } catch (error) {
    console.error('Error blacklisting refresh token:', error);
    throw error;
  }
}

/**
 * Check if access token is blacklisted
 * @param {string} token - JWT access token
 * @returns {Promise<boolean>}
 */
async function isTokenBlacklisted(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      return false;
    }

    const blacklistKey = `${BLACKLIST_PREFIX}${decoded.jti}`;
    const result = await cache.exists(blacklistKey);
    return result === 1;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
}

/**
 * Check if refresh token is blacklisted
 * @param {string} token - JWT refresh token
 * @returns {Promise<boolean>}
 */
async function isRefreshTokenBlacklisted(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      return false;
    }

    const blacklistKey = `${REFRESH_BLACKLIST_PREFIX}${decoded.jti}`;
    const result = await cache.exists(blacklistKey);
    return result === 1;
  } catch (error) {
    console.error('Error checking refresh token blacklist:', error);
    return false;
  }
}

/**
 * Revoke all user tokens
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  try {
    // Get all user token keys
    const pattern = `${USER_TOKENS_PREFIX}${userId}:*`;
    const keys = await cache.keys(pattern);
    
    // Get all refresh tokens and blacklist them
    for (const key of keys) {
      const tokenData = await cache.get(key);
      if (tokenData) {
        const { token } = JSON.parse(tokenData);
        await blacklistRefreshToken(token);
      }
    }
    
    // Delete all user token keys
    if (keys.length > 0) {
      await cache.del(...keys);
    }
  } catch (error) {
    console.error('Error revoking all user tokens:', error);
    throw error;
  }
}

/**
 * Revoke user session tokens
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
async function revokeSessionTokens(userId, sessionId) {
  try {
    const refreshTokenKey = `${USER_TOKENS_PREFIX}${userId}:${sessionId}`;
    const tokenData = await cache.get(refreshTokenKey);
    
    if (tokenData) {
      const { token } = JSON.parse(tokenData);
      await blacklistRefreshToken(token);
    }
    
    await cache.del(refreshTokenKey);
  } catch (error) {
    console.error('Error revoking session tokens:', error);
    throw error;
  }
}

/**
 * Get user active sessions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active sessions
 */
async function getUserActiveSessions(userId) {
  try {
    const pattern = `${USER_TOKENS_PREFIX}${userId}:*`;
    const keys = await cache.keys(pattern);
    
    const sessions = [];
    for (const key of keys) {
      const tokenData = await cache.get(key);
      if (tokenData) {
        const data = JSON.parse(tokenData);
        const sessionId = key.split(':').pop();
        
        // Decode token to get expiry
        const decoded = jwt.decode(data.token);
        
        sessions.push({
          sessionId,
          createdAt: data.createdAt,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          isExpired: decoded.exp < Math.floor(Date.now() / 1000)
        });
      }
    }
    
    return sessions.filter(session => !session.isExpired);
  } catch (error) {
    console.error('Error getting user active sessions:', error);
    return [];
  }
}

/**
 * Convert time string to seconds
 * @param {string} timeString - Time string (e.g., '15m', '7d')
 * @returns {number} Seconds
 */
function getTokenExpirySeconds(timeString) {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800
  };
  
  const match = timeString.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error('Invalid time format');
  }
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date
 */
function getTokenExpiry(token) {
  const decoded = decodeToken(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} Is expired
 */
function isTokenExpired(token) {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
}

/**
 * Clean up expired blacklisted tokens (should be run periodically)
 * @returns {Promise<void>}
 */
async function cleanupExpiredTokens() {
  try {
    // This is handled automatically by Redis TTL, but we can add additional cleanup logic here
    console.log('Token cleanup completed');
  } catch (error) {
    console.error('Error during token cleanup:', error);
  }
}

module.exports = {
  JWT_CONFIG,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  blacklistRefreshToken,
  isTokenBlacklisted,
  isRefreshTokenBlacklisted,
  revokeAllUserTokens,
  revokeSessionTokens,
  getUserActiveSessions,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
  cleanupExpiredTokens,
  getTokenExpirySeconds
};