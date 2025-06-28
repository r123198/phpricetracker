const NodeCache = require('node-cache');
const Redis = require('ioredis');

// Config
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS) || 600; // 10 min
const CACHE_CHECK_PERIOD = parseInt(process.env.CACHE_CHECK_PERIOD_SECONDS) || 120;
const CACHE_MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS) || 1000;
const ENABLE_REDIS_CACHE = process.env.ENABLE_REDIS_CACHE === 'true' || !!process.env.REDIS_URL;

// Redis config
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_OPTIONS = REDIS_URL
  ? { 
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false
    }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false
    };

// Redis client (if enabled)
let redis = null;
let redisConnected = false;

if (ENABLE_REDIS_CACHE) {
  redis = REDIS_URL ? new Redis(REDIS_URL, REDIS_OPTIONS) : new Redis(REDIS_OPTIONS);
  
  redis.on('connect', () => {
    redisConnected = true;
    console.log('✅ Redis cache connected');
  });
  
  redis.on('error', err => {
    redisConnected = false;
    console.warn('⚠️ Redis cache error (falling back to node-cache):', err.message);
  });
  
  redis.on('close', () => {
    redisConnected = false;
    console.warn('⚠️ Redis cache disconnected (falling back to node-cache)');
  });
}

// NodeCache fallback
const nodeCache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_CHECK_PERIOD,
  maxKeys: CACHE_MAX_KEYS,
  useClones: false,
  deleteOnExpire: true
});

let cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

// Helper to check if Redis is available
const isRedisAvailable = () => ENABLE_REDIS_CACHE && redis && redisConnected;

// Unified cache interface
const cacheUtils = {
  get: async (key) => {
    if (isRedisAvailable()) {
      try {
        const value = await redis.get(key);
        if (value !== null) { 
          cacheStats.hits++; 
          return JSON.parse(value); 
        }
        cacheStats.misses++; 
        return null;
      } catch (error) {
        console.warn('Redis get error, using node-cache:', error.message);
        redisConnected = false;
      }
    }
    
    // Fallback to node-cache
    const value = nodeCache.get(key);
    if (value) cacheStats.hits++; 
    else cacheStats.misses++;
    return value;
  },

  set: async (key, value, ttl = CACHE_TTL) => {
    if (isRedisAvailable()) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
        cacheStats.sets++;
        return;
      } catch (error) {
        console.warn('Redis set error, using node-cache:', error.message);
        redisConnected = false;
      }
    }
    
    // Fallback to node-cache
    nodeCache.set(key, value, ttl);
    cacheStats.sets++;
  },

  del: async (key) => {
    if (isRedisAvailable()) {
      try {
        const deleted = await redis.del(key);
        if (deleted) cacheStats.deletes++;
        return deleted;
      } catch (error) {
        console.warn('Redis del error, using node-cache:', error.message);
        redisConnected = false;
      }
    }
    
    // Fallback to node-cache
    const deleted = nodeCache.del(key);
    if (deleted) cacheStats.deletes++;
    return deleted;
  },

  flush: async () => {
    if (isRedisAvailable()) {
      try {
        await redis.flushdb();
      } catch (error) {
        console.warn('Redis flush error, using node-cache:', error.message);
        redisConnected = false;
      }
    }
    
    // Always flush node-cache as well
    nodeCache.flushAll();
    cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  },

  getStats: () => {
    const keys = isRedisAvailable() ? [] : nodeCache.keys();
    return {
      ...cacheStats,
      keys: keys.length,
      maxKeys: CACHE_MAX_KEYS,
      ttl: CACHE_TTL,
      checkPeriod: CACHE_CHECK_PERIOD,
      backend: isRedisAvailable() ? 'redis' : 'node-cache',
      redisConnected: redisConnected
    };
  },

  clearByPattern: async (pattern) => {
    if (isRedisAvailable()) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(keys);
        cacheStats.deletes += keys.length;
        return keys.length;
      } catch (error) {
        console.warn('Redis clearByPattern error, using node-cache:', error.message);
        redisConnected = false;
      }
    }
    
    // Fallback to node-cache
    const keys = nodeCache.keys();
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    keys.forEach(key => { 
      if (regex.test(key)) { 
        nodeCache.del(key); 
        deletedCount++; 
      } 
    });
    cacheStats.deletes += deletedCount;
    return deletedCount;
  },

  getOrSet: async (key, fallbackFn, ttl = CACHE_TTL) => {
    let value = await cacheUtils.get(key);
    if (value) return value;
    value = await fallbackFn();
    await cacheUtils.set(key, value, ttl);
    return value;
  }
};

// Cache middleware for Express
const cacheMiddleware = (ttl = CACHE_TTL) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' || req.path.includes('/admin')) return next();
    const cacheKey = `route:${req.originalUrl}`;
    
    try {
      const cachedData = await cacheUtils.get(cacheKey);
      if (cachedData) return res.json(cachedData);
      
      const originalSend = res.json;
      res.json = async function(data) {
        try {
          await cacheUtils.set(cacheKey, data, ttl);
        } catch (error) {
          console.warn('Cache middleware set error:', error.message);
        }
        return originalSend.call(this, data);
      };
      next();
    } catch (error) {
      console.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

module.exports = {
  cache: isRedisAvailable() ? redis : nodeCache,
  cacheMiddleware,
  cacheUtils,
  CACHE_TTL,
  CACHE_CHECK_PERIOD,
  CACHE_MAX_KEYS
}; 