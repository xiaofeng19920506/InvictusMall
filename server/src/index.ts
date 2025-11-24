import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import fetch from "node-fetch";
import storeRoutes from "./routes/storeRoutes";
import systemRoutes from "./routes/systemRoutes";
import activityLogRoutes from "./routes/activityLogRoutes";
import authRoutes from "./routes/authRoutes";
import staffRoutes from "./routes/staffRoutes";
import orderRoutes from "./routes/orderRoutes";
import adminOrderRoutes from "./routes/adminOrderRoutes";
import shippingAddressRoutes from "./routes/shippingAddressRoutes";
import paymentRoutes, { stripeWebhookHandler } from "./routes/paymentRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { testConnection, initializeDatabase } from "./config/database";
import { setupSwagger } from "./config/swagger";
import { accountCleanupService } from "./services/accountCleanupService";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins
app.use(
  cors({
    origin: true, // Allow all origins
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

// Stripe webhook endpoint must be registered before body parsers
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Static file serving for uploaded avatars
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Proxy route for images from external storage service
app.get("/images/*", async (req, res) => {
  try {
    // Get the external storage base URL from environment or derive from upload URL
    const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
    const storageBaseUrl =
      process.env.FILE_STORAGE_BASE_URL ||
      externalUploadUrl.replace("/api/files/upload", "");
    const imagePath = req.path; // This will be "/images/..."

    // Construct the full URL to the external storage service
    const imageUrl = `${storageBaseUrl}${imagePath}`;

    // Fetch the image from the external storage service
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({
        success: false,
        message: "Image not found",
        error: `Failed to fetch image: ${imageResponse.statusText}`,
      });
    }

    // Set appropriate headers
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // Stream the image data to the response
    const imageBuffer = await imageResponse.arrayBuffer();
    return res.send(Buffer.from(imageBuffer));
  } catch (error: any) {
    console.error("Error proxying image:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch image",
      error: error.message,
    });
  }
});

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
app.get("/health", async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: dbStatus,
      status: dbStatus ? "connected" : "disconnected",
    },
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
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/shipping-addresses", shippingAddressRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/upload", uploadRoutes);

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
      console.log(
        `📡 Accessible at http://localhost:${PORT} or http://[your-ip]:${PORT}`
      );

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
