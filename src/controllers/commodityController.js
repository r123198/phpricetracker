const prisma = require('../config/database');
const { createResponse, createErrorResponse } = require('../utils/response');

/**
 * @swagger
 * /v1/commodities:
 *   get:
 *     summary: Get all commodities
 *     description: Retrieve a list of all available commodities with their categories and metadata
 *     tags: [Commodities]
 *     responses:
 *       200:
 *         description: List of commodities retrieved successfully
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
 *                   example: Commodities retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       _count:
 *                         type: object
 *                         properties:
 *                           prices:
 *                             type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     total:
 *                       type: number
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
const getAllCommodities = async (req, res, next) => {
  try {
    const commodities = await prisma.commodity.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            prices: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const response = createResponse(commodities, 'Commodities retrieved successfully', {
      total: commodities.length,
      lastUpdated: new Date().toISOString()
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/commodities/{id}:
 *   get:
 *     summary: Get commodity by ID
 *     description: Retrieve a specific commodity by its ID
 *     tags: [Commodities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commodity ID
 *     responses:
 *       200:
 *         description: Commodity retrieved successfully
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
 *                   example: Commodity retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     _count:
 *                       type: object
 *                       properties:
 *                         prices:
 *                           type: number
 *       404:
 *         description: Commodity not found
 *       500:
 *         description: Internal server error
 */
const getCommodityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const commodity = await prisma.commodity.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            prices: true
          }
        }
      }
    });

    if (!commodity) {
      throw createErrorResponse('Commodity not found', 404);
    }

    const response = createResponse(commodity, 'Commodity retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCommodities,
  getCommodityById
}; 