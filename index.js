require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { runAllScrapers } = require('./scrapers/run_all');

// Import routes
const commodityRoutes = require('./src/routes/commodityRoutes');
const priceRoutes = require('./src/routes/priceRoutes');
const docsRoutes = require('./src/routes/docs');
const scraperRoutes = require('./src/routes/scraperRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    scrapers: {
      lastRun: global.lastScraperRun || null,
      nextRun: global.nextScraperRun || null
    }
  });
});

// API documentation
app.use('/docs', docsRoutes);

// API routes (v1)
app.use('/v1/commodities', commodityRoutes);
app.use('/v1/prices', priceRoutes);
app.use('/v1/admin', scraperRoutes);

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
    },
    scrapers: {
      manual: 'POST /v1/admin/scrape',
      scheduled: 'Daily at 7:00 AM'
    }
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Schedule daily scraping at 7:00 AM
const scheduleScrapers = () => {
  console.log('⏰ Scheduling daily scrapers at 7:00 AM...');
  
  cron.schedule('0 7 * * *', async () => {
    console.log('🔄 Running scheduled scrapers...');
    try {
      global.lastScraperRun = new Date().toISOString();
      await runAllScrapers();
      console.log('✅ Scheduled scrapers completed successfully');
    } catch (error) {
      console.error('❌ Scheduled scrapers failed:', error.message);
    }
  }, {
    timezone: 'Asia/Manila'
  });

  // Calculate next run time
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(7, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  global.nextScraperRun = nextRun.toISOString();
  
  console.log(`📅 Next scraper run: ${nextRun.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Schedule scrapers after server starts
  scheduleScrapers();
});

module.exports = app; 