import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import storeRoutes from "./routes/storeRoutes";
import systemRoutes from "./routes/systemRoutes";
import activityLogRoutes from "./routes/activityLogRoutes";
import authRoutes from "./routes/authRoutes";
import staffRoutes from "./routes/staffRoutes";
import orderRoutes from "./routes/orderRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { testConnection, initializeDatabase } from "./config/database";
import { setupSwagger } from "./config/swagger";
import { accountCleanupService } from "./services/accountCleanupService";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Security middleware
app.use(helmet());

// CORS configuration
// Allow localhost and local network IPs
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

// Add custom origins from environment variable (comma-separated)
if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(",").map(origin => origin.trim()));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const localNetworkRegex = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;
        if (localNetworkRegex.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Logging middleware
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Static file serving for uploaded avatars
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use("/api/stores", storeRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/orders", orderRoutes);

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
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Invictus Mall API",
    version: "1.0.0",
    endpoints: {
      stores: "/api/stores",
      health: "/health",
      docs: "/api-docs",
    },
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
      // Don't exit, just continue with mock data
    } else {
      // Initialize database schema only if connected
      await initializeDatabase();
    }

    // Start server - listen on all network interfaces (0.0.0.0) to accept connections from other machines
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 Accessible at http://localhost:${PORT} or http://[your-ip]:${PORT}`);

      // Start account cleanup service (runs daily)
      // Only start if database is connected
      if (isConnected) {
        const cleanupIntervalHours = parseInt(
          process.env.ACCOUNT_CLEANUP_INTERVAL_HOURS || "24"
        );
        accountCleanupService.start(cleanupIntervalHours);
      } else {
        console.log(
          "⚠️ Account cleanup service disabled (database not connected)"
        );
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log(
    "SIGTERM signal received: closing HTTP server and cleanup scheduler"
  );
  accountCleanupService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log(
    "SIGINT signal received: closing HTTP server and cleanup scheduler"
  );
  accountCleanupService.stop();
  process.exit(0);
});

startServer();

export default app;
