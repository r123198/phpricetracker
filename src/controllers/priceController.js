const prisma = require('../config/database');
const { createResponse, createPaginatedResponse, createErrorResponse } = require('../utils/response');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const { cacheUtils } = require('../utils/cache');

/**
 * @swagger
 * /v1/prices/latest:
 *   get:
 *     summary: Get latest prices
 *     description: Retrieve the latest prices for all commodities with optional filtering by region and category
 *     tags: [Prices]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region (e.g., Region VII, NCR)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by commodity category (e.g., Vegetables, Fuel, Grains)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results to return (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Latest prices retrieved successfully
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
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       commodityId:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *                       unit:
 *                         type: string
 *                       region:
 *                         type: string
 *                       source:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       commodity:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           slug:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       500:
 *         description: Internal server error
 */
const getLatestPrices = async (req, res, next) => {
  try {
    const { region, category, limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Create cache key based on query parameters
    const cacheKey = `latest_prices:${region || 'all'}:${category || 'all'}:${limitNum}:${pageNum}`;
    
    // Try to get from cache first
    const cachedData = cacheUtils.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build where clause
    const where = {};
    
    if (region) {
      where.region = region;
    }
    
    if (category) {
      where.commodity = {
        category: category
      };
    }

    // Get latest prices with pagination
    const prices = await prisma.price.findMany({
      where,
      include: {
        commodity: {
          select: {
            id: true,
            name: true,
            category: true,
            slug: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count for pagination
    const total = await prisma.price.count({ where });

    const response = createPaginatedResponse(prices, pageNum, limitNum, total);
    
    // Cache the response for 5 minutes (shorter TTL for frequently changing data)
    cacheUtils.set(cacheKey, response, 300);
    
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/prices/{commodity_id}:
 *   get:
 *     summary: Get latest price for specific commodity
 *     description: Retrieve the most recent price for a specific commodity
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: commodity_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commodity ID
 *     responses:
 *       200:
 *         description: Latest price retrieved successfully
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
 *                   example: Latest price retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     commodityId:
 *                       type: string
 *                     price:
 *                       type: number
 *                       format: float
 *                     unit:
 *                       type: string
 *                     region:
 *                       type: string
 *                     source:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     commodity:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         category:
 *                           type: string
 *                         slug:
 *                           type: string
 *       404:
 *         description: No price data found for this commodity
 *       500:
 *         description: Internal server error
 */
const getCommodityPrice = async (req, res, next) => {
  try {
    const { commodity_id } = req.params;

    const latestPrice = await prisma.price.findFirst({
      where: {
        commodityId: commodity_id
      },
      include: {
        commodity: {
          select: {
            id: true,
            name: true,
            category: true,
            slug: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (!latestPrice) {
      throw createErrorResponse('No price data found for this commodity', 404);
    }

    const response = createResponse(latestPrice, 'Latest price retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/prices/{commodity_id}/history:
 *   get:
 *     summary: Get price history for commodity
 *     description: Retrieve historical price data for a specific commodity with optional regional filtering
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: commodity_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commodity ID
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region (e.g., Region VII, NCR)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 100
 *         description: Number of results to return (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Price history retrieved successfully
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
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       commodityId:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *                       unit:
 *                         type: string
 *                       region:
 *                         type: string
 *                       source:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       commodity:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           slug:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       404:
 *         description: No price history found for this commodity
 *       500:
 *         description: Internal server error
 */
const getCommodityPriceHistory = async (req, res, next) => {
  try {
    const { commodity_id } = req.params;
    const { region, limit = 30, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      commodityId: commodity_id
    };
    
    if (region) {
      where.region = region;
    }

    const prices = await prisma.price.findMany({
      where,
      include: {
        commodity: {
          select: {
            id: true,
            name: true,
            category: true,
            slug: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: limitNum
    });

    if (prices.length === 0) {
      throw createErrorResponse('No price history found for this commodity', 404);
    }

    const total = await prisma.price.count({ where });
    const response = createPaginatedResponse(prices, pageNum, limitNum, total);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Validation middleware for price creation
const validatePriceData = [
  body('commodityId').notEmpty().withMessage('Commodity ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').notEmpty().withMessage('Unit is required'),
  body('region').notEmpty().withMessage('Region is required'),
  body('source').notEmpty().withMessage('Source is required'),
  body('date').isISO8601().withMessage('Date must be a valid ISO date')
];

/**
 * @swagger
 * /v1/prices/admin:
 *   post:
 *     summary: Create new price data (Admin only)
 *     description: Add new price data for a commodity. Requires API key authentication.
 *     tags: [Admin]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commodityId
 *               - price
 *               - unit
 *               - region
 *               - source
 *               - date
 *             properties:
 *               commodityId:
 *                 type: string
 *                 description: ID of the commodity
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Price value
 *               unit:
 *                 type: string
 *                 description: Unit of measurement (e.g., per kg, per liter)
 *               region:
 *                 type: string
 *                 description: Region where the price was recorded
 *               source:
 *                 type: string
 *                 description: Source of the price data (e.g., DTI, DA, DOE)
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date when the price was recorded (ISO format)
 *           example:
 *             commodityId: "commodity_id_here"
 *             price: 45.50
 *             unit: "per kg"
 *             region: "Region VII"
 *             source: "DTI"
 *             date: "2024-01-15"
 *     responses:
 *       201:
 *         description: Price data created successfully
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
 *                   example: Price data created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     commodityId:
 *                       type: string
 *                     price:
 *                       type: number
 *                       format: float
 *                     unit:
 *                       type: string
 *                     region:
 *                       type: string
 *                     source:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     commodity:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         category:
 *                           type: string
 *                         slug:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: API key is required
 *       403:
 *         description: Invalid API key
 *       404:
 *         description: Commodity not found
 *       409:
 *         description: Price data already exists for this commodity, region, and date
 *       500:
 *         description: Internal server error
 */
const createPrice = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createErrorResponse(errors.array()[0].msg, 400);
    }

    const { commodityId, price, unit, region, source, date } = req.body;

    // Check if commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: commodityId }
    });

    if (!commodity) {
      throw createErrorResponse('Commodity not found', 404);
    }

    // Create price record
    const newPrice = await prisma.price.create({
      data: {
        commodityId,
        price: parseFloat(price),
        unit,
        region,
        source,
        date: new Date(date)
      },
      include: {
        commodity: {
          select: {
            id: true,
            name: true,
            category: true,
            slug: true
          }
        }
      }
    });

    const response = createResponse(newPrice, 'Price data created successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/prices/da/ranges:
 *   get:
 *     summary: Get all DA price ranges
 *     description: Retrieve all DA price ranges from parsed PDF data
 *     tags: [DA Price Ranges]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results to return (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: DA price ranges retrieved successfully
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
 *                   example: DA price ranges retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       commodity:
 *                         type: string
 *                       unit:
 *                         type: string
 *                       minPrice:
 *                         type: number
 *                       maxPrice:
 *                         type: number
 *                       averagePrice:
 *                         type: number
 *                       source:
 *                         type: string
 *                       region:
 *                         type: string
 *                       date:
 *                         type: string
 *                       category:
 *                         type: string
 *                       hasRange:
 *                         type: boolean
 *                       filename:
 *                         type: string
 *                       market:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
const getDAPriceRanges = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Read the DA price ranges JSON file
    const filePath = path.join(__dirname, '../../output/latest_price_ranges_da.json');
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const allRanges = JSON.parse(fileContent);
      
      // Apply pagination
      const total = allRanges.length;
      const ranges = allRanges.slice(skip, skip + limitNum);
      
      const response = createPaginatedResponse(ranges, pageNum, limitNum, total);
      res.json(response);
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        throw createErrorResponse('DA price ranges data not available. Please run the DA parser first.', 404);
      }
      throw fileError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/prices/da/ranges/{region}:
 *   get:
 *     summary: Get DA price ranges by region
 *     description: Retrieve DA price ranges for a specific region
 *     tags: [DA Price Ranges]
 *     parameters:
 *       - in: path
 *         name: region
 *         required: true
 *         schema:
 *           type: string
 *         description: Region name (e.g., NCR, RX)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results to return (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: DA price ranges for region retrieved successfully
 *       404:
 *         description: Region not found or no data available
 *       500:
 *         description: Internal server error
 */
const getDAPriceRangesByRegion = async (req, res, next) => {
  try {
    const { region } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Try to read region-specific file first
    const regionFilePath = path.join(__dirname, `../../output/latest_price_ranges_da_${region.toLowerCase().replace(/\s+/g, '_')}.json`);
    
    try {
      const fileContent = await fs.readFile(regionFilePath, 'utf8');
      const regionRanges = JSON.parse(fileContent);
      
      // Apply pagination
      const total = regionRanges.length;
      const ranges = regionRanges.slice(skip, skip + limitNum);
      
      const response = createPaginatedResponse(ranges, pageNum, limitNum, total);
      res.json(response);
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        // Fallback to filtering from main file
        const mainFilePath = path.join(__dirname, '../../output/latest_price_ranges_da.json');
        try {
          const fileContent = await fs.readFile(mainFilePath, 'utf8');
          const allRanges = JSON.parse(fileContent);
          const regionRanges = allRanges.filter(range => 
            range.region.toLowerCase() === region.toLowerCase()
          );
          
          if (regionRanges.length === 0) {
            throw createErrorResponse(`No data found for region: ${region}`, 404);
          }
          
          // Apply pagination
          const total = regionRanges.length;
          const ranges = regionRanges.slice(skip, skip + limitNum);
          
          const response = createPaginatedResponse(ranges, pageNum, limitNum, total);
          res.json(response);
        } catch (mainFileError) {
          throw createErrorResponse('DA price ranges data not available. Please run the DA parser first.', 404);
        }
      } else {
        throw fileError;
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/prices/da/markets/{market}:
 *   get:
 *     summary: Get DA price ranges by market
 *     description: Retrieve DA price ranges for a specific market
 *     tags: [DA Price Ranges]
 *     parameters:
 *       - in: path
 *         name: market
 *         required: true
 *         schema:
 *           type: string
 *         description: Market name (e.g., Balintawak, Cartimar Market)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results to return (max 100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: DA price ranges for market retrieved successfully
 *       404:
 *         description: Market not found or no data available
 *       500:
 *         description: Internal server error
 */
const getDAPriceRangesByMarket = async (req, res, next) => {
  try {
    const { market } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Read the main DA price ranges file and filter by market
    const filePath = path.join(__dirname, '../../output/latest_price_ranges_da.json');
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const allRanges = JSON.parse(fileContent);
      
      // Filter by market (case-insensitive partial match)
      const marketRanges = allRanges.filter(range => 
        range.market && range.market.toLowerCase().includes(market.toLowerCase())
      );
      
      if (marketRanges.length === 0) {
        throw createErrorResponse(`No data found for market: ${market}`, 404);
      }
      
      // Apply pagination
      const total = marketRanges.length;
      const ranges = marketRanges.slice(skip, skip + limitNum);
      
      const response = createPaginatedResponse(ranges, pageNum, limitNum, total);
      res.json(response);
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        throw createErrorResponse('DA price ranges data not available. Please run the DA parser first.', 404);
      }
      throw fileError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLatestPrices,
  getCommodityPrice,
  getCommodityPriceHistory,
  createPrice,
  validatePriceData,
  getDAPriceRanges,
  getDAPriceRangesByRegion,
  getDAPriceRangesByMarket
}; 