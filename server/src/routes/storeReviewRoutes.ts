import { Router, Request, Response } from "express";
import { StoreReviewModel } from "../models/StoreReviewModel";
import { authenticateStaffToken, AuthenticatedRequest } from "../middleware/auth";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { pool } from "../config/database";

const router = Router();
const reviewModel = new StoreReviewModel();

/**
 * @swagger
 * /api/stores/{storeId}/reviews:
 *   get:
 *     summary: Get store reviews (Admin/Staff)
 *     tags: [Store Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, helpful, rating]
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get("/:storeId/reviews", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { limit, offset, rating, sortBy } = req.query;

    if (!storeId) {
      return ApiResponseHelper.validationError(res, "Store ID is required");
    }

    const result = await reviewModel.findByStoreId(storeId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      rating: rating ? parseInt(rating as string) : undefined,
      sortBy: sortBy as any,
    });

    return ApiResponseHelper.successWithPagination(res, result.reviews, result.total);
  } catch (error: any) {
    logger.error("Error fetching store reviews", error, { storeId: req.params.storeId });
    return ApiResponseHelper.error(res, "Failed to fetch reviews", 500, error);
  }
});

/**
 * @swagger
 * /api/stores/{storeId}/reviews/stats:
 *   get:
 *     summary: Get store review statistics (Admin/Staff)
 *     tags: [Store Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review stats retrieved successfully
 */
router.get("/:storeId/reviews/stats", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return ApiResponseHelper.validationError(res, "Store ID is required");
    }

    const stats = await reviewModel.getReviewStats(storeId);

    return ApiResponseHelper.success(res, stats);
  } catch (error: any) {
    logger.error("Error fetching store review stats", error, { storeId: req.params.storeId });
    return ApiResponseHelper.error(res, "Failed to fetch review stats", 500, error);
  }
});

/**
 * @swagger
 * /api/stores/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a store review (Admin only)
 *     tags: [Store Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         description: Only administrators can delete reviews
 */
router.delete("/reviews/:reviewId", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const user = req.user!;

    if (!reviewId) {
      return ApiResponseHelper.validationError(res, "Review ID is required");
    }

    // Get the review to find the store ID
    const review = await reviewModel.findById(reviewId);
    const storeId = review.storeId;

    // Check if user is admin
    const isAdmin = user.role === "admin";

    // Check if user is store owner (through staff_stores table)
    let isStoreOwner = false;
    if (!isAdmin) {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(`
          SELECT COUNT(*) as count
          FROM staff_stores
          WHERE staff_id = ? AND store_id = ?
        `, [user.id, storeId]);
        const result = rows as any[];
        isStoreOwner = result[0]?.count > 0;
      } catch (error) {
        logger.error("Error checking store ownership", error);
      } finally {
        connection.release();
      }
    }

    // Only admin or store owner can delete reviews
    if (!isAdmin && !isStoreOwner) {
      return ApiResponseHelper.forbidden(res, "Only administrators and store owners can delete reviews");
    }

    const deleted = await reviewModel.delete(reviewId);

    if (!deleted) {
      return ApiResponseHelper.error(res, "Review not found", 404);
    }

    return ApiResponseHelper.success(res, null, "Review deleted successfully");
  } catch (error: any) {
    logger.error("Error deleting store review", error, { reviewId: req.params.reviewId });
    return ApiResponseHelper.error(res, "Failed to delete review", 500, error);
  }
});

/**
 * @swagger
 * /api/stores/reviews/{reviewId}/reply:
 *   post:
 *     summary: Reply to a store review (Admin/Store Owner only)
 *     tags: [Store Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply added successfully
 *       403:
 *         description: Only administrators and store owners can reply to reviews
 */
router.post("/reviews/:reviewId/reply", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const user = req.user!;

    if (!reviewId) {
      return ApiResponseHelper.validationError(res, "Review ID is required");
    }

    if (!reply || reply.trim().length === 0) {
      return ApiResponseHelper.validationError(res, "Reply text is required");
    }

    // Get the review to find the store ID
    const review = await reviewModel.findById(reviewId);
    const storeId = review.storeId;

    // Check if user is admin
    const isAdmin = user.role === "admin";

    // Check if user is store owner (through staff_stores table)
    let isStoreOwner = false;
    if (!isAdmin) {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(`
          SELECT COUNT(*) as count
          FROM staff_stores
          WHERE staff_id = ? AND store_id = ?
        `, [user.id, storeId]);
        const result = rows as any[];
        isStoreOwner = result[0]?.count > 0;
      } catch (error) {
        logger.error("Error checking store ownership", error);
      } finally {
        connection.release();
      }
    }

    // Only admin or store owner can reply to reviews
    if (!isAdmin && !isStoreOwner) {
      return ApiResponseHelper.forbidden(res, "Only administrators and store owners can reply to reviews");
    }

    const updatedReview = await reviewModel.replyToReview(reviewId, reply.trim(), user.id);

    return ApiResponseHelper.success(res, updatedReview, "Reply added successfully");
  } catch (error: any) {
    logger.error("Error replying to review", error, { reviewId: req.params.reviewId });
    return ApiResponseHelper.error(res, "Failed to reply to review", 500, error);
  }
});

export default router;

