const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      message: message || 'Rate limit exceeded'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

// Public routes rate limiter
const publicRateLimiter = createRateLimiter();

// Admin routes rate limiter (more restrictive)
const adminRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requests per 15 minutes
  'Admin rate limit exceeded'
);

module.exports = {
  publicRateLimiter,
  adminRateLimiter
}; 