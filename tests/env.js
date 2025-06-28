// Environment setup for tests
require('dotenv').config({ path: '.env.test' });

// Set default test environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/price_tracker_test';
process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001';

// Rate limiting for tests - shorter windows and lower limits
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '60000'; // 1 minute for tests
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '5';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '5'; // Backward compatibility
process.env.RATE_LIMIT_MAX_REQUESTS_STRICT = process.env.RATE_LIMIT_MAX_REQUESTS_STRICT || '10';
process.env.RATE_LIMIT_MAX_REQUESTS_AUTH = process.env.RATE_LIMIT_MAX_REQUESTS_AUTH || '5';

// Admin rate limiting for tests
process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS = process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS || '5'; // Increased from 2 to 5 for admin route tests

// Disable logging in tests unless explicitly enabled
if (process.env.TEST_LOGGING !== 'true') {
  process.env.LOG_LEVEL = 'error';
}

// Set test-specific configurations
process.env.TEST_MODE = 'true';
process.env.DISABLE_CRON = 'true';
process.env.DISABLE_EMAIL = 'true';

console.log('Test environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : '***not configured***',
  TEST_MODE: process.env.TEST_MODE
}); 