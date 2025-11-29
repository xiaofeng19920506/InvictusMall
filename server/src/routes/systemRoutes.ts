import { Router, Request, Response } from "express";
import { accountCleanupService } from "../services/accountCleanupService";
import { orderCleanupService } from "../services/orderCleanupService";
import { tokenCleanupService } from "../services/tokenCleanupService";
import { lowStockAlertService } from "../services/lowStockAlertService";
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { assignOrphanedStoresToAdmin } from "../config/database";

const router = Router();

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: Get system status and connected apps
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     apps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           url:
 *                             type: string
 *                           status:
 *                             type: string
 *                     server:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         timestamp:
 *                           type: string
 */
router.get("/status", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  return ApiResponseHelper.success(res, {
    apps: [
      {
        name: "Backend API",
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`,
        status: "online",
        description: "Express.js API Server",
      },
      {
        name: "Frontend Store",
        url: "http://localhost:3000",
        status: "external",
        description: "Next.js Customer Interface",
      },
      {
        name: "Admin Dashboard",
        url: "http://localhost:3003",
        status: "external",
        description: "React Admin Panel",
      },
    ],
    server: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
});

/**
 * @swagger
 * /api/system/apps:
 *   get:
 *     summary: Get information about all connected applications
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Apps information retrieved successfully
 */
router.get("/apps", (req: Request, res: Response) => {
  return ApiResponseHelper.success(res, [
    {
      name: "Invictus Mall API",
      type: "backend",
      url: process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`,
      endpoints: {
        health: "/health",
        stores: "/api/stores",
        docs: "/api-docs",
      },
      status: "online",
    },
    {
      name: "Invictus Mall Store",
      type: "frontend",
      url: "http://localhost:3000",
      description: "Customer shopping interface",
      features: ["Store browsing", "Search", "Categories"],
      status: "external",
    },
    {
      name: "Invictus Mall Admin",
      type: "admin",
      url: "http://localhost:3003",
      description: "Store management dashboard",
      features: ["Store CRUD", "Analytics", "System monitoring"],
      status: "external",
    },
  ]);
});

/**
 * @swagger
 * /api/system/cleanup/status:
 *   get:
 *     summary: Get account cleanup service status
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                     hasScheduler:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/cleanup/status",
  authenticateStaffToken,
  (req: AuthenticatedRequest, res: Response) => {
    const status = {
      accountCleanup: accountCleanupService.getStatus(),
      orderCleanup: orderCleanupService.getStatus(),
      tokenCleanup: tokenCleanupService.getStatus(),
      lowStockAlert: lowStockAlertService.getStatus(),
    };
    return ApiResponseHelper.success(res, status);
  }
);

/**
 * @swagger
 * /api/system/cleanup/run:
 *   post:
 *     summary: Manually trigger account cleanup
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *                     duration:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/cleanup/run",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type } = req.body;
      
      if (!type || type === "accounts") {
        const stats = await accountCleanupService.cleanupUnactivatedAccounts();
        return ApiResponseHelper.success(
          res,
          stats,
          `Account cleanup completed: ${stats.deletedCount} account(s) deleted`
        );
      } else if (type === "orders") {
        const stats = await orderCleanupService.cancelPendingOrders();
        return ApiResponseHelper.success(
          res,
          stats,
          `Order cleanup completed: ${stats.cancelledCount} order(s) cancelled`
        );
      } else if (type === "tokens") {
        const stats = await tokenCleanupService.cleanupExpiredTokens();
        return ApiResponseHelper.success(
          res,
          stats,
          `Token cleanup completed`
        );
      } else {
        return ApiResponseHelper.validationError(res, "Invalid cleanup type. Use: 'accounts', 'orders', or 'tokens'");
      }
    } catch (error: any) {
      logger.error("Failed to run cleanup", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to run cleanup", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/system/cleanup/orders:
 *   post:
 *     summary: Manually trigger order cleanup
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/cleanup/orders",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await orderCleanupService.cancelPendingOrders();
      return ApiResponseHelper.success(
        res,
        stats,
        `Order cleanup completed: ${stats.cancelledCount} order(s) cancelled`
      );
    } catch (error: any) {
      logger.error("Failed to run order cleanup", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to run order cleanup", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/system/cleanup/tokens:
 *   post:
 *     summary: Manually trigger token cleanup
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/cleanup/tokens",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await tokenCleanupService.cleanupExpiredTokens();
      return ApiResponseHelper.success(
        res,
        stats,
        `Token cleanup completed`
      );
    } catch (error: any) {
      logger.error("Failed to run token cleanup", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to run token cleanup", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/system/alerts/low-stock:
 *   post:
 *     summary: Manually trigger low stock alert check
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/alerts/low-stock",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await lowStockAlertService.checkLowStock();
      return ApiResponseHelper.success(
        res,
        stats,
        `Low stock check completed: ${stats.alertCount} alert(s) found`
      );
    } catch (error: any) {
      logger.error("Failed to run low stock check", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to run low stock check", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/system/assign-orphaned-stores:
 *   post:
 *     summary: Assign orphaned stores (without owner/admin) to the first admin user
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orphaned stores assigned successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/assign-orphaned-stores",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only allow admin users to run this
      if (req.staff?.role !== "admin") {
        ApiResponseHelper.forbidden(res, "Only admin users can assign orphaned stores");
        return;
      }

      logger.info("Starting orphaned stores assignment", { userId: req.staff.id });

      await assignOrphanedStoresToAdmin();

      logger.info("Orphaned stores assignment completed", { userId: req.staff.id });

      ApiResponseHelper.success(
        res,
        { message: "Orphaned stores assignment completed successfully" },
        "Orphaned stores have been assigned to admin users"
      );
    } catch (error: any) {
      logger.error("Failed to assign orphaned stores", error, { userId: req.staff?.id });
      ApiResponseHelper.error(res, "Failed to assign orphaned stores", 500, error);
    }
  }
);

export default router;
