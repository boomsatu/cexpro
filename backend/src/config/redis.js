const redis = require('redis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};

// Create Redis client
const client = redis.createClient(redisConfig);

// Redis event handlers
client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('ready', () => {
  console.log('Redis client ready');
});

client.on('error', (err) => {
  console.error('Redis client error:', err);
});

client.on('end', () => {
  console.log('Redis client disconnected');
});

client.on('reconnecting', () => {
  console.log('Redis client reconnecting');
});

// Redis v4+ already uses promises natively
const getAsync = client.get.bind(client);
const setAsync = client.set.bind(client);
const delAsync = client.del.bind(client);
const existsAsync = client.exists.bind(client);
const expireAsync = client.expire.bind(client);
const ttlAsync = client.ttl.bind(client);
const hgetAsync = client.hGet.bind(client);
const hsetAsync = client.hSet.bind(client);
const hdelAsync = client.hDel.bind(client);
const hgetallAsync = client.hGetAll.bind(client);
const saddAsync = client.sAdd.bind(client);
const sremAsync = client.sRem.bind(client);
const smembersAsync = client.sMembers.bind(client);
const sismemberAsync = client.sIsMember.bind(client);
const zaddAsync = client.zAdd.bind(client);
const zrangeAsync = client.zRange.bind(client);
const zremAsync = client.zRem.bind(client);
const incrAsync = client.incr.bind(client);
const decrAsync = client.decr.bind(client);
const incrbyAsync = client.incrBy.bind(client);
const decrbyAsync = client.decrBy.bind(client);
const lpushAsync = client.lPush.bind(client);
const ltrimAsync = client.lTrim.bind(client);
const lrangeAsync = client.lRange.bind(client);

// Cache helper functions
const cache = {
  // Basic cache operations
  async get(key) {
    try {
      const value = await getAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await setAsync(key, serialized, 'EX', ttl);
      } else {
        await setAsync(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      return await delAsync(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      return await existsAsync(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  async expire(key, ttl) {
    try {
      return await expireAsync(key, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  },

  async ttl(key) {
    try {
      return await ttlAsync(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  },

  async setex(key, ttl, value) {
    try {
      await setAsync(key, value, { EX: ttl });
      return true;
    } catch (error) {
      console.error('Cache setex error:', error);
      return false;
    }
  },

  // Hash operations
  async hget(key, field) {
    try {
      const value = await hgetAsync(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hget error:', error);
      return null;
    }
  },

  async hset(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      return await hsetAsync(key, field, serialized);
    } catch (error) {
      console.error('Cache hset error:', error);
      return false;
    }
  },

  async hgetall(key) {
    try {
      const hash = await hgetallAsync(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error('Cache hgetall error:', error);
      return {};
    }
  },

  // Set operations
  async sadd(key, ...members) {
    try {
      return await saddAsync(key, ...members);
    } catch (error) {
      console.error('Cache sadd error:', error);
      return false;
    }
  },

  async srem(key, ...members) {
    try {
      return await sremAsync(key, ...members);
    } catch (error) {
      console.error('Cache srem error:', error);
      return false;
    }
  },

  async smembers(key) {
    try {
      return await smembersAsync(key);
    } catch (error) {
      console.error('Cache smembers error:', error);
      return [];
    }
  },

  async sismember(key, member) {
    try {
      return await sismemberAsync(key, member);
    } catch (error) {
      console.error('Cache sismember error:', error);
      return false;
    }
  },

  // Counter operations
  async incr(key) {
    try {
      return await incrAsync(key);
    } catch (error) {
      console.error('Cache incr error:', error);
      return null;
    }
  },

  async decr(key) {
    try {
      return await decrAsync(key);
    } catch (error) {
      console.error('Cache decr error:', error);
      return null;
    }
  },

  async incrby(key, increment) {
    try {
      return await incrbyAsync(key, increment);
    } catch (error) {
      console.error('Cache incrby error:', error);
      return false;
    }
  },

  // List operations
  async lpush(key, ...values) {
    try {
      return await lpushAsync(key, ...values);
    } catch (error) {
      console.error('Cache lpush error:', error);
      return false;
    }
  },

  async ltrim(key, start, stop) {
    try {
      return await ltrimAsync(key, start, stop);
    } catch (error) {
      console.error('Cache ltrim error:', error);
      return false;
    }
  },

  async lrange(key, start, stop) {
    try {
      const values = await lrangeAsync(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error('Cache lrange error:', error);
      return [];
    }
  }
};

// Session management helpers
const session = {
  async create(sessionId, userId, data = {}) {
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...data
    };
    
    const ttl = 24 * 60 * 60; // 24 hours
    return await cache.set(`session:${sessionId}`, sessionData, ttl);
  },

  async get(sessionId) {
    return await cache.get(`session:${sessionId}`);
  },

  async update(sessionId, data) {
    const existing = await this.get(sessionId);
    if (!existing) return false;
    
    const updated = {
      ...existing,
      ...data,
      lastActivity: new Date().toISOString()
    };
    
    return await cache.set(`session:${sessionId}`, updated, await cache.ttl(`session:${sessionId}`));
  },

  async destroy(sessionId) {
    return await cache.del(`session:${sessionId}`);
  },

  async destroyAllUserSessions(userId) {
    try {
      // This would require scanning all session keys, which is expensive
      // Better to maintain a user->sessions mapping
      const userSessions = await cache.smembers(`user_sessions:${userId}`);
      const promises = userSessions.map(sessionId => this.destroy(sessionId));
      await Promise.all(promises);
      return await cache.del(`user_sessions:${userId}`);
    } catch (error) {
      console.error('Error destroying user sessions:', error);
      throw error; // Re-throw to maintain API contract
    }
  }
};

// Rate limiting helpers
const rateLimit = {
  async check(key, limit, window) {
    const current = await cache.incr(key);
    if (current === 1) {
      await cache.expire(key, window);
    }
    return current <= limit;
  },

  async reset(key) {
    return await cache.del(key);
  }
};

// Health check
const healthCheck = async () => {
  try {
    await setAsync('health_check', 'ok', 'EX', 10);
    const result = await getAsync('health_check');
    return result === 'ok';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

// Graceful shutdown
const close = () => {
  return new Promise((resolve) => {
    client.quit(() => {
      console.log('Redis client closed');
      resolve();
    });
  });
};

module.exports = {
  client,
  cache,
  session,
  rateLimit,
  healthCheck,
  close
};