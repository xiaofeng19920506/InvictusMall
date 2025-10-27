import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import storeRoutes from './routes/storeRoutes';
import systemRoutes from './routes/systemRoutes';
import activityLogRoutes from './routes/activityLogRoutes';
import authRoutes from './routes/authRoutes';
import staffRoutes from './routes/staffRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { testConnection, initializeDatabase } from './config/database';
import { setupSwagger } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is running
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
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use('/api/stores', storeRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
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
 *                   example: "Invictus Mall API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     stores:
 *                       type: string
 *                       example: "/api/stores"
 *                     health:
 *                       type: string
 *                       example: "/health"
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Invictus Mall API',
    version: '1.0.0',
    endpoints: {
      stores: '/api/stores',
      health: '/health',
      docs: '/api-docs'
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection (skip for now and use mock data)
    const isConnected = await testConnection();
    if (!isConnected) {
      console.warn('⚠️  Database connection failed. Using mock data instead.');
      // Don't exit, just continue with mock data
    } else {
      // Initialize database schema only if connected
      await initializeDatabase();
      console.log('🗄️  Database: MySQL connected successfully');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Express server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🏪 Stores API: http://localhost:${PORT}/api/stores`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      if (!isConnected) {
        console.log(`🎭 Using mock data (database not connected)`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
