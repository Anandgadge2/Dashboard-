import express, { Application, Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Import configurations
import { connectDatabase, closeDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './config/logger'; 

// Import routes
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import companyRoutes from './routes/company.routes';
import departmentRoutes from './routes/department.routes';
import userRoutes from './routes/user.routes';
import grievanceRoutes from './routes/grievance.routes';
import appointmentRoutes from './routes/appointment.routes';
import analyticsRoutes from './routes/analytics.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import importRoutes from './routes/import.routes';
import exportRoutes from './routes/export.routes';
import auditRoutes from './routes/audit.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ================================
// Middleware
// ================================

// Security - Configure helmet to allow WhatsApp webhook requests
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for webhook endpoints
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin requests from WhatsApp
}));

// CORS - Allow WhatsApp webhook requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, WhatsApp webhooks)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://graph.facebook.com',
      'https://*.facebook.com',
      'https://*.whatsapp.com'
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return origin === allowed;
    });
    
    callback(null, isAllowed);
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ================================
// Routes
// ================================

// Health check (basic)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Dashboard API Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      companies: '/api/companies',
      departments: '/api/departments',
      users: '/api/users',
      grievances: '/api/grievances',
      appointments: '/api/appointments',
      analytics: '/api/analytics',
      webhook: '/webhook or /api/webhook/whatsapp (GET for verification, POST for messages)',
      import: '/api/import',
      export: '/api/export',
      audit: '/api/audit'
    }
  });
});

// Webhook routes (must be before /api routes to avoid middleware blocking)
// These routes should NOT have authentication or other middleware that might block WhatsApp
app.use('/webhook', whatsappRoutes);
app.use('/api/webhook/whatsapp', whatsappRoutes);

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ================================
// Error Handling
// ================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ================================
// Server Initialization
// ================================

const startServer = async () => {
  let mongoConnected = false;
  let redisConnected = false;

  // Try to connect to MongoDB (CRITICAL - server should not start without DB)
  try {
    await connectDatabase();
    mongoConnected = true;
    logger.info('✅ MongoDB connected successfully');
  } catch (error: any) {
    logger.error('❌ MongoDB connection failed:', error.message);
    logger.error('');
    logger.error('🚨 CRITICAL: Server cannot function without database connection!');
    logger.error('');
    logger.error('💡 To fix this:');
    logger.error('   1. Check your internet connection');
    logger.error('   2. Verify MONGODB_URI in .env file');
    logger.error('   3. Check MongoDB Atlas network access (if using Atlas)');
    logger.error('   4. Verify database credentials');
    logger.error('');
    logger.error('⚠️  Server will start but database operations will fail!');
    logger.error('⚠️  Please fix the database connection and restart the server.');
    logger.error('');
  }

  // Try to connect to Redis (optional, non-blocking)
  try {
    const redis = await connectRedis();
    if (redis) {
      redisConnected = true;
      logger.info('✅ Redis connected successfully');
    } else {
      logger.warn('⚠️  Running without Redis (caching disabled)');
    }
  } catch (error: any) {
    logger.warn('⚠️  Redis connection failed:', error.message);
    logger.warn('⚠️  Running without Redis (caching disabled)');
  }

  // Start server regardless of database connections
  try {
    app.listen(PORT, () => {
      logger.info('');
      logger.info('='.repeat(60));
      logger.info('🚀 SERVER STARTED SUCCESSFULLY');
      logger.info('='.repeat(60));
      logger.info(`📍 Port: ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info('');
      logger.info('📊 Connection Status:');
      logger.info(`   MongoDB: ${mongoConnected ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   Redis:   ${redisConnected ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info('='.repeat(60));
      
      if (!mongoConnected) {
        logger.warn('');
        logger.warn('⚠️  WARNING: Server is running without MongoDB!');
        logger.warn('⚠️  Most API endpoints will not work until MongoDB connects.');
        logger.warn('⚠️  Please fix the connection issue. See NETWORK_TROUBLESHOOTING.md');
        logger.warn('');
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start HTTP server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('⚠️  Unhandled Promise Rejection:', reason);
  logger.error('⚠️  The application will continue running, but this should be investigated');
  // Don't exit - let the app continue running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('⚠️  Uncaught Exception:', error);
  logger.error('⚠️  The application will continue running, but this should be investigated');
  // Don't exit - let the app continue running
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabase();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await closeDatabase();
  await disconnectRedis();
  process.exit(0);
});



// Start the server
startServer();

export default app;
