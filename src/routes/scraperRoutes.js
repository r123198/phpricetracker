const express = require('express');
const { runAllScrapers } = require('../../scrapers/run_all');
const { validateApiKey } = require('../middleware/auth');
const { adminRateLimiter } = require('../middleware/rateLimiter');
const { createResponse, createErrorResponse } = require('../utils/response');

const router = express.Router();

// Apply rate limiting and authentication to all admin routes
router.use(adminRateLimiter, validateApiKey);

/**
 * @swagger
 * /v1/admin/scrape:
 *   post:
 *     summary: Run all scrapers manually (Admin only)
 *     description: Manually trigger all scrapers to collect latest price data. Requires API key authentication.
 *     tags: [Admin]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Scrapers executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scrapers executed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     scrapersRun:
 *                       type: number
 *                       description: Number of scrapers executed
 *                     newPrices:
 *                       type: number
 *                       description: Number of new price records added
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Any errors encountered during scraping
 *                     duration:
 *                       type: number
 *                       description: Execution time in milliseconds
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: API key is required
 *       403:
 *         description: Invalid API key
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/scrape', async (req, res, next) => {
  try {
    console.log('🔄 Manual scraper execution requested...');
    const startTime = Date.now();

    const result = await runAllScrapers();
    const duration = Date.now() - startTime;

    // Update global scraper run time
    global.lastScraperRun = new Date().toISOString();

    const response = createResponse({
      scrapersRun: result.scrapersRun || 0,
      newPrices: result.newPrices || 0,
      errors: result.errors || [],
      duration
    }, 'Scrapers executed successfully');

    res.json(response);
  } catch (error) {
    console.error('❌ Manual scraper execution failed:', error);
    next(error);
  }
});

/**
 * @swagger
 * /v1/admin/scrape/status:
 *   get:
 *     summary: Get scraper status (Admin only)
 *     description: Get information about scraper execution status and schedule. Requires API key authentication.
 *     tags: [Admin]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Scraper status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scraper status retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                       description: Last scraper execution time
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                       description: Next scheduled scraper execution
 *                     schedule:
 *                       type: string
 *                       description: Cron schedule expression
 *                     timezone:
 *                       type: string
 *                       description: Timezone for scheduling
 *       401:
 *         description: API key is required
 *       403:
 *         description: Invalid API key
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/scrape/status', (req, res) => {
  const response = createResponse({
    lastRun: global.lastScraperRun || null,
    nextRun: global.nextScraperRun || null,
    schedule: '0 7 * * *',
    timezone: 'Asia/Manila',
    description: 'Daily at 7:00 AM Philippine time'
  }, 'Scraper status retrieved successfully');

  res.json(response);
});

module.exports = router; 