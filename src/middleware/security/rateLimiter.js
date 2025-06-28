const rateLimit = require('express-rate-limit');

// In-memory store for rate limiting
const rateLimitStore = new Map();

console.log('Rate limiter configuration:');
console.log('RATE_LIMIT_WINDOW_MS:', process.env.RATE_LIMIT_WINDOW_MS);
console.log('RATE_LIMIT_MAX_REQUESTS:', process.env.RATE_LIMIT_MAX_REQUESTS);

// Test middleware to verify rate limiter is applied
const testMiddleware = (req, res, next) => {
  console.log('Test middleware - rate limiter should be applied');
  next();
};

// Function to clear rate limit store (for testing)
const clearRateLimitStore = () => {
  rateLimitStore.clear();
  console.log('Rate limit store cleared');
};

// Custom rate limiter middleware
const createRateLimiter = (windowMs = 60000, max = 100) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 0,
        resetTime: now + windowMs
      });
    }
    
    const record = rateLimitStore.get(key);
    
    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (record.count >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    // Count the request immediately (all requests count toward rate limit)
    record.count++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - record.count),
      'X-RateLimit-Reset': Math.floor(record.resetTime / 1000), // Unix timestamp in seconds
      'Retry-After': Math.ceil((record.resetTime - now) / 1000)
    });
    
    next();
  };
};

// Create rate limiters with different configurations
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);

const strictLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  parseInt(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS) || 10
);

const authLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_AUTH) || 5
);

module.exports = {
  generalLimiter,
  strictLimiter,
  authLimiter,
  testMiddleware,
  clearRateLimitStore
}; 