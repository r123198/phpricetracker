// Test setup file for Jest
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { clearRateLimitStore } = require('../src/middleware/security/rateLimiter');

// Set up environment variables for testing
require('dotenv').config({ path: path.join(__dirname, 'env.js') });

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
process.exit = jest.fn();

// Mock fs operations for tests
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
  ...path,
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((filePath) => filePath.split('/').slice(0, -1).join('/')),
  basename: jest.fn((filePath) => filePath.split('/').pop())
}));

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    commodity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    price: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  }))
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock helmet
jest.mock('helmet', () => {
  const helmet = jest.fn(() => (req, res, next) => next());
  helmet.hsts = jest.fn(() => (req, res, next) => next());
  return helmet;
});

// Mock cors
jest.mock('cors', () => jest.fn(() => (req, res, next) => next()));

// Mock swagger-ui-express
jest.mock('swagger-ui-express', () => ({
  serve: jest.fn(),
  setup: jest.fn(() => (req, res, next) => next())
}));

// Mock swagger-jsdoc
jest.mock('swagger-jsdoc', () => jest.fn());

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock price data
  createMockPriceData: (overrides = {}) => ({
    commodity: 'Test Rice',
    price: 45.50,
    unit: 'per kg',
    region: 'NCR',
    source: 'Test',
    date: new Date(),
    ...overrides
  }),

  // Helper to create mock commodity data
  createMockCommodityData: (overrides = {}) => ({
    name: 'Test Rice',
    category: 'Grains',
    slug: 'test-rice',
    description: 'Test commodity for testing',
    ...overrides
  }),

  // Helper to create mock DA price range data
  createMockDAPriceRangeData: (overrides = {}) => ({
    commodity: 'Rice at Balintawak Market',
    unit: 'per kg',
    minPrice: 45.00,
    maxPrice: 48.00,
    averagePrice: 46.50,
    source: 'DA',
    region: 'NCR',
    date: '2025-06-26',
    category: 'rice',
    hasRange: true,
    filename: 'test.pdf',
    market: 'Balintawak Market',
    ...overrides
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock request object
  createMockRequest: (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides
  }),

  // Helper to create mock response object
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn()
};

// Export test utilities for use in test files
module.exports = global.testUtils;

// Helper to start and stop the Express server on a random port for tests
let serverInstance;

/**
 * Starts the app server on a random port for testing.
 * @param {Express.Application} app
 * @returns {Promise<{server: *, port: number}>}
 */
global.startTestServer = async (app) => {
  return new Promise((resolve, reject) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      process.env.PORT = port;
      resolve({ server: serverInstance, port });
    });
    serverInstance.on('error', reject);
  });
};

/**
 * Stops the test server if running.
 */
global.stopTestServer = async () => {
  if (serverInstance && serverInstance.close) {
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = null;
  }
};

// Global beforeAll hook
beforeAll(() => {
  console.log('Setting up test environment...');
  // Clear rate limit store before all tests
  clearRateLimitStore();
});

// Global afterAll hook
afterAll(async () => {
  console.log('Cleaning up test environment...');
  // Clear rate limit store after all tests
  clearRateLimitStore();
  await global.stopTestServer();
});

// Global beforeEach hook
beforeEach(() => {
  // Reset mocks and state before each test
  jest.clearAllMocks();
  // Clear rate limit store before each test
  clearRateLimitStore();
});

// Global afterEach hook
afterEach(() => {
  // Cleanup after each test
}); 