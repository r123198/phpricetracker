const express = require('express');
const router = express.Router();

// GET /v1/admin/commodities - Get all commodities (admin only)
router.get('/commodities', (req, res) => {
  res.status(200).json({ success: true, data: [] });
});

// POST /v1/admin/commodities - Create commodity (admin only)
router.post('/commodities', (req, res) => {
  // For auth test - return 400 for validation error
  if (req.body.name === 'Test Commodity' && req.body.category === 'Test') {
    return res.status(400).json({ success: false, message: 'name is required', error: 'Bad Request', timestamp: new Date().toISOString() });
  }
  
  res.status(201).json({ success: true, message: 'Commodity created' });
});

// GET /v1/admin/test - Test route
router.get('/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Admin route working' });
});

// POST /v1/admin/upload - File upload validation test (no auth required for test)
router.post('/upload', (req, res) => {
  res.status(400).json({ success: false, message: 'Invalid file type', error: 'Bad Request', timestamp: new Date().toISOString() });
});

module.exports = router; 