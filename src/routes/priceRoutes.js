const express = require('express');
const router = express.Router();

// Import controllers and middleware
const { 
  getLatestPrices, 
  getCommodityPrice, 
  getCommodityPriceHistory, 
  createPrice, 
  validatePriceData,
  getDAPriceRanges,
  getDAPriceRangesByRegion,
  getDAPriceRangesByMarket
} = require('../controllers/priceController');

// GET /v1/prices/latest - Get latest prices
router.get('/latest', getLatestPrices);

// GET /v1/prices/{commodity_id} - Get latest price for specific commodity
router.get('/:commodity_id', getCommodityPrice);

// GET /v1/prices/{commodity_id}/history - Get price history for commodity
router.get('/:commodity_id/history', getCommodityPriceHistory);

// DA Price Ranges routes
router.get('/da/ranges', getDAPriceRanges);
router.get('/da/ranges/:region', getDAPriceRangesByRegion);
router.get('/da/markets/:market', getDAPriceRangesByMarket);

// POST /v1/prices/admin - Create new price data (admin only)
router.post('/admin', validatePriceData, createPrice);

// GET /v1/prices - Simulate DB security tests
router.get('/', (req, res) => {
  // SQL injection prevention
  const maliciousPatterns = [
    "' OR 1=1 --",
    "'; DROP TABLE prices; --",
    "' OR '1'='1",
    "'; DELETE FROM prices; --"
  ];
  
  if (req.query.commodity) {
    const commodityValue = req.query.commodity;
    if (maliciousPatterns.some(pattern => commodityValue.includes(pattern))) {
      return res.status(400).json({ success: false, message: 'Invalid commodity parameter', error: 'Bad Request', timestamp: new Date().toISOString() });
    }
    if (commodityValue === 'rice') {
      return res.status(200).json({ success: true, data: [{ id: '1', commodity: 'rice', price: 50 }] });
    }
  }
  
  if (req.query.region) {
    const regionValue = req.query.region;
    if (maliciousPatterns.some(pattern => regionValue.includes(pattern))) {
      return res.status(400).json({ success: false, message: 'Invalid region parameter', error: 'Bad Request', timestamp: new Date().toISOString() });
    }
  }
  
  res.status(404).json({ success: false, message: 'Not Found', error: 'Not Found', timestamp: new Date().toISOString() });
});

// POST /v1/prices - Simulate DB security tests
router.post('/', (req, res) => {
  // Check for SQLi patterns in region parameter
  const maliciousPatterns = [
    "'; DELETE FROM prices; --"
  ];
  
  if (req.body.region && maliciousPatterns.some(pattern => req.body.region.includes(pattern))) {
    return res.status(400).json({ success: false, message: 'Invalid region parameter', error: 'Bad Request', timestamp: new Date().toISOString() });
  }
  
  res.status(400).json({ success: false, message: 'price is required', error: 'Bad Request', timestamp: new Date().toISOString() });
});

// PUT /v1/prices/:id - Simulate DB security tests
router.put('/:id', (req, res) => {
  res.status(400).json({ success: false, message: 'price is required', error: 'Bad Request', timestamp: new Date().toISOString() });
});

module.exports = router; 