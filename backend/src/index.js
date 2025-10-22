require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { testConnection, initializeDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createUploadDirs } = require('./middleware/upload');
const { startAllJobs, stopAllJobs } = require('./services/cronService');

/**
 * Create Express Application
 */
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Security Middleware
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * CORS Configuration
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Compression Middleware
 */
app.use(compression());

/**
 * Logging Middleware
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Static Files - Serve uploaded files
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bunker Management System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * API Routes
 */
app.use('/api/vessels', require('./routes/vessels'));
app.use('/api/tankers', require('./routes/tankers'));
app.use('/api/voyages', require('./routes/voyages'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings/company', require('./routes/companySettings'));
app.use('/api/templates', require('./routes/documentTemplates'));
app.use('/api/sales-order-confirmations', require('./routes/salesOrderConfirmations'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/email-templates', require('./routes/emailTemplates'));
app.use('/api/settings/email', require('./routes/emailSettings'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/cron', require('./routes/cronJobs'));

/**
 * 404 Handler
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting Bunker Management System...\n');

    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database tables
    console.log('📋 Initializing database tables...');
    await initializeDatabase();

    // Create upload directories
    console.log('📁 Creating upload directories...');
    createUploadDirs();

    // Start cron jobs (if not in test mode)
    if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_CRON !== 'false') {
      console.log('⏰ Starting scheduled tasks...');
      startAllJobs();
    }

    // Start listening
    app.listen(PORT, () => {
      console.log('\n✅ Server is running successfully!');
      console.log(`🌐 API Server: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n📖 API Documentation:');
      console.log('   - Vessels: /api/vessels');
      console.log('   - Tankers: /api/tankers');
      console.log('   - Voyages: /api/voyages');
      console.log('   - Orders: /api/orders');
      console.log('   - Company Settings: /api/settings/company');
      console.log('   - Document Templates: /api/templates');
      console.log('   - Sales Order Confirmations: /api/sales-order-confirmations');
      console.log('   - Invoices: /api/invoices');
      console.log('   - Email Templates: /api/email-templates');
      console.log('   - Email Settings: /api/settings/email');
      console.log('   - Email Operations: /api/emails');
      console.log('   - Dashboard: /api/dashboard');
      console.log('   - Reports: /api/reports');
      console.log('   - Cron Jobs: /api/cron');
      console.log('\n👨‍💻 Ready to accept requests!\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Handle Uncaught Exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Handle Unhandled Promise Rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received: closing HTTP server');
  stopAllJobs();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
