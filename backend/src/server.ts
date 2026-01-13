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
import { configureCloudinary } from './config/cloudinary';

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
import assignmentRoutes from './routes/assignment.routes';
import statusRoutes from './routes/status.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

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
    message: 'Dashboard API Server is running'  });
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
app.use('/api/assignments', assignmentRoutes);
app.use('/api/status', statusRoutes);
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

  // Configure Cloudinary
  try {
    configureCloudinary();
  } catch (error: any) {
    logger.error('Cloudinary configuration failed:', error.message);
  }

  // Connect to MongoDB
  try {
    await connectDatabase();
    mongoConnected = true;
  } catch (error: any) {
    logger.error('MongoDB connection failed:', error.message);
  }

  // Connect to Redis (optional)
  try {
    const redis = await connectRedis();
    if (redis) redisConnected = true;
  } catch (error: any) {
    // Redis is optional, continue without it
  }

  // Start server
  try {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`MongoDB: ${mongoConnected ? '✅' : '❌'} | Redis: ${redisConnected ? '✅' : '❌'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start HTTP server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeDatabase();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeDatabase();
  await disconnectRedis();
  process.exit(0);
});



// Start the server
startServer();

export default app;