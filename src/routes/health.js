const express = require('express');
const router = express.Router();
const { cacheUtils } = require('../utils/cache');
const prisma = require('../config/database');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: "production"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       description: Memory usage in MB
 *                     total:
 *                       type: number
 *                       description: Total memory in MB
 *                     percentage:
 *                       type: number
 *                       description: Memory usage percentage
 *                 cache:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: number
 *                     misses:
 *                       type: number
 *                     keys:
 *                       type: number
 *                     hitRate:
 *                       type: number
 *                       description: Cache hit rate percentage
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                     responseTime:
 *                       type: number
 *                       description: Database ping time in milliseconds
 *       503:
 *         description: Service is unhealthy
 */
const getHealth = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Get cache statistics
    const cacheStats = cacheUtils.getStats();
    const cache = {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      keys: cacheStats.keys,
      hitRate: cacheStats.hits + cacheStats.misses > 0 
        ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
        : 0
    };

    // Test database connection (skip in test environment)
    let database = { status: 'unknown', responseTime: 0 };
    
    if (process.env.NODE_ENV !== 'test' && process.env.TEST_MODE !== 'true') {
      try {
        const dbStartTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbResponseTime = Date.now() - dbStartTime;
        database = {
          status: 'connected',
          responseTime: dbResponseTime
        };
      } catch (dbError) {
        database = {
          status: 'error',
          responseTime: 0,
          error: dbError.message
        };
      }
    } else {
      // In test environment, assume database is healthy
      database = {
        status: 'connected',
        responseTime: 1,
        note: 'test environment'
      };
    }

    // Determine overall health status
    const isHealthy = database.status === 'connected' && memory.percentage < 90;
    const statusCode = isHealthy ? 200 : 503;

    const healthData = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory,
      cache,
      database,
      responseTime: Date.now() - startTime
    };

    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Check if the service is ready to receive traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
const getReadiness = async (req, res) => {
  try {
    // Check database connection (skip in test environment)
    if (process.env.NODE_ENV !== 'test' && process.env.TEST_MODE !== 'true') {
      await prisma.$queryRaw`SELECT 1`;
    }
    
    // Check memory usage (don't accept traffic if memory usage is too high)
    const memUsage = process.memoryUsage();
    const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memoryPercentage > 90) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'High memory usage',
        memoryPercentage: Math.round(memoryPercentage)
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: 'Database connection failed',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Check if the service is alive and running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
const getLiveness = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
};

// Health check routes
router.get('/', getHealth);
router.get('/ready', getReadiness);
router.get('/live', getLiveness);

module.exports = router; 