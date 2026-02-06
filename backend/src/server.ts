import express, { Application, Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Load environment variables
dotenv.config();

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
import availabilityRoutes from './routes/availability.routes';
import uploadRoutes from './routes/upload.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';



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


app.use(
  cors({
    origin: true,        // reflect origin
    credentials: true
  })
);

app.options("*", cors());

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
app.use('/api/availability', availabilityRoutes);
app.use('/api/uploads', uploadRoutes);

// ================================
// Error Handling
// ================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ================================
// Server Initialization
const init = async () => {
  // Configure Cloudinary
  try {
    configureCloudinary();
  } catch (error: any) {
    logger.error('Cloudinary configuration failed:', error.message);
  }

  // Connect to MongoDB
  try {
    await connectDatabase();
  } catch (error: any) {
    logger.error('MongoDB connection failed:', error.message);
  }

  // Connect to Redis (optional)
  try {
    await connectRedis();
  } catch (error: any) {
    // Redis is optional
  }

  // Initialize ID counters (for atomic ID generation)
  try {
    const { initializeCounters } = await import('./utils/idGenerator');
    await initializeCounters();
    logger.info('✅ ID counters initialized');
  } catch (error: any) {
    logger.warn('⚠️ Counter initialization failed (non-critical):', error.message);
  }
};

// For local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const startServer = async () => {
    await init();
    
    // Create server instance
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    // Production-grade error handling for port conflicts
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        logger.error('💡 Solutions:');
        logger.error('   1. Kill the process: taskkill /F /IM node.exe');
        logger.error('   2. Use a different port: set PORT=5001');
        logger.error('   3. Find process: netstat -ano | findstr :5000');
        
        // Try to gracefully shutdown
        setTimeout(() => {
          logger.info('⏳ Attempting graceful shutdown...');
          process.exit(1);
        }, 1000);
      } else if (error.code === 'EACCES') {
        logger.error(`❌ Permission denied to use port ${PORT}`);
        logger.error('💡 Try using a port above 1024 or run with elevated privileges');
        process.exit(1);
      } else {
        logger.error('❌ Failed to start HTTP server:', error);
        process.exit(1);
      }
    });

    // Handle server listening event
    server.on('listening', () => {
      const addr = server.address();
      const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
      logger.info(`✅ Server listening on ${bind}`);
    });

    return server;
  };
  
  startServer().catch(err => {
    logger.error('❌ Server startup failed:', err);
    process.exit(1);
  });
} else {
  // In Vercel environment, init needs to be handled
  // We'll call it once at the top level if supported, or rely on lazy-loading
  init().catch(err => logger.error('Vercel initialization failed:', err));
}

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

export default app;
