require('dotenv').config();
const express = require('express');

// Security middleware
const helmetConfig = require('./middleware/security/helmetConfig');
const corsConfig = require('./middleware/security/corsConfig');
const { 
  generalLimiter, 
  strictLimiter, 
  authLimiter, 
  clearRateLimitStore 
} = require('./middleware/security/rateLimiter');
const apiKeyAuth = require('./middleware/security/apiKeyAuth');
const errorHandler = require('./middleware/security/errorHandler');

// Import routes
const commodityRoutes = require('./routes/commodityRoutes');
const priceRoutes = require('./routes/priceRoutes');
const docsRoutes = require('./routes/docs');
const adminRoutes = require('./routes/adminRoutes');
const healthRoutes = require('./routes/health');

// Import cache utilities
const { cacheMiddleware, cacheUtils } = require('./utils/cache');
const { getQueueStats, closeQueue } = require('./utils/queue');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
helmetConfig(app);

// CORS
app.use(corsConfig);

// Compression middleware for better performance
if (process.env.ENABLE_COMPRESSION !== 'false') {
  const compression = require('compression');
  app.use(compression());
}

// Simple test route with only rate limiting
app.get('/test-rate-limit', generalLimiter, (req, res) => {
  res.json({ message: 'Rate limit test route' });
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoints (no caching, no rate limiting)
app.use('/health', healthRoutes);

// API documentation (stub for tests)
app.get('/api-docs', (req, res) => {
  res.status(200).json({ success: true, docs: true });
});

// API documentation
app.use('/docs', docsRoutes);

// API routes (v1) - Apply general rate limiting and caching to public routes
const enableCache = process.env.ENABLE_CACHE !== 'false';
const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 600;

if (enableCache) {
  app.use('/v1/commodities', generalLimiter, cacheMiddleware(cacheTTL), commodityRoutes);
  app.use('/v1/prices', generalLimiter, cacheMiddleware(cacheTTL), priceRoutes);
} else {
  app.use('/v1/commodities', generalLimiter, commodityRoutes);
  app.use('/v1/prices', generalLimiter, priceRoutes);
}

// File upload validation test route (no auth required)
app.post('/v1/admin/upload', (req, res) => {
  // Check if file exists in request
  if (!req.files || !req.files.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', error: 'Bad Request', timestamp: new Date().toISOString() });
  }
  
  const file = req.files.file;
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'File size too large', error: 'Bad Request', timestamp: new Date().toISOString() });
  }
  
  // Check file type
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    return res.status(400).json({ success: false, message: 'Invalid file type', error: 'Bad Request', timestamp: new Date().toISOString() });
  }
  
  res.status(200).json({ success: true, message: 'File uploaded successfully' });
});

// Admin routes with auth and strict rate limiting
app.use('/v1/admin', apiKeyAuth, strictLimiter, adminRoutes);

// Cache management endpoint (admin only)
app.get('/v1/admin/cache/stats', apiKeyAuth, (req, res) => {
  const stats = cacheUtils.getStats();
  res.json({
    success: true,
    message: 'Cache statistics retrieved successfully',
    data: stats
  });
});

app.post('/v1/admin/cache/clear', apiKeyAuth, (req, res) => {
  cacheUtils.flush();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// Job queue management endpoints (admin only)
app.get('/v1/admin/queue/stats', apiKeyAuth, async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({
      success: true,
      message: 'Queue statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Philippine Market Price Tracker API',
    version: '1.0.0',
    documentation: '/docs',
    health: '/health',
    endpoints: {
      commodities: '/v1/commodities',
      prices: '/v1/prices',
      admin: '/v1/admin'
    }
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown with cache cleanup
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Clear cache on shutdown
  try {
    await cacheUtils.flush();
    console.log('Cache cleared on shutdown');
  } catch (error) {
    console.error('Error clearing cache on shutdown:', error);
  }
  
  // Close job queue connections
  try {
    await closeQueue();
    console.log('Job queue connections closed');
  } catch (error) {
    console.error('Error closing queue connections:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Memory monitoring (optional)
if (process.env.NODE_ENV === 'production') {
  const maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB) || 512;
  
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memoryMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memoryMB > maxMemoryMB * 0.8) {
      console.warn(`High memory usage: ${Math.round(memoryMB)}MB / ${maxMemoryMB}MB`);
    }
  }, 60000); // Check every minute
}

// Start server only if this is the main module (not when imported for testing)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Cache: ${enableCache ? 'enabled' : 'disabled'}`);
    console.log(`📦 Compression: ${process.env.ENABLE_COMPRESSION !== 'false' ? 'enabled' : 'disabled'}`);
  });
}

// Export for testing
module.exports = { app, clearRateLimitStore, cacheUtils }; 