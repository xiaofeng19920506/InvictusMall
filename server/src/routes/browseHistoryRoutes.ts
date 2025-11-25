import { Router, Request, Response } from "express";
import { BrowseHistoryModel } from "../models/BrowseHistoryModel";
import { authenticateUserToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const historyModel = new BrowseHistoryModel();

/**
 * @swagger
 * /api/browse-history:
 *   get:
 *     summary: Get user's browse history
 *     tags: [Browse History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Browse history retrieved successfully
 */
router.get(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { limit, offset } = req.query;

      const result = await historyModel.getUserHistory(req.user.id, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result.history,
        total: result.total,
      });
    } catch (error: any) {
      console.error("Error fetching browse history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch browse history",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/browse-history:
 *   post:
 *     summary: Record a product view
 *     tags: [Browse History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: View recorded successfully
 */
router.post(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { productId } = req.body;

      if (!productId || typeof productId !== 'string') {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
        return;
      }

      await historyModel.recordView(req.user.id, productId);

      res.json({
        success: true,
        message: "View recorded successfully",
      });
    } catch (error: any) {
      console.error("Error recording view:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record view",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/browse-history:
 *   delete:
 *     summary: Clear user's browse history
 *     tags: [Browse History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Browse history cleared successfully
 */
router.delete(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      await historyModel.clearUserHistory(req.user.id);

      res.json({
        success: true,
        message: "Browse history cleared successfully",
      });
    } catch (error: any) {
      console.error("Error clearing browse history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear browse history",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/browse-history/{historyId}:
 *   delete:
 *     summary: Delete a specific history item
 *     tags: [Browse History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History item deleted successfully
 */
router.delete(
  "/:historyId",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { historyId } = req.params;

      if (!historyId) {
        res.status(400).json({
          success: false,
          message: "History ID is required",
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      await historyModel.deleteHistoryItem(req.user.id, historyId);

      res.json({
        success: true,
        message: "History item deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting history item:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete history item",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/browse-history/recommendations:
 *   get:
 *     summary: Get product recommendations based on browse history
 *     tags: [Browse History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get(
  "/recommendations",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const productIds = await historyModel.getRecommendedProducts(req.user.id, limit);

      res.json({
        success: true,
        data: productIds,
      });
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recommendations",
        error: error.message,
      });
    }
  }
);

export default router;

