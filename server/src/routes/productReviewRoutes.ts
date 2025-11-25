import { Router, Request, Response } from "express";
import { ProductReviewModel, CreateReviewRequest } from "../models/ProductReviewModel";
import { authenticateUserToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const reviewModel = new ProductReviewModel();

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   get:
 *     summary: Get product reviews
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
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
router.get("/:productId/reviews", async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { limit, offset, rating, sortBy } = req.query;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
      return;
    }

    const result = await reviewModel.findByProductId(productId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      rating: rating ? parseInt(rating as string) : undefined,
      sortBy: sortBy as any,
    });

    res.json({
      success: true,
      data: result.reviews,
      total: result.total,
    });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/products/{productId}/reviews/stats:
 *   get:
 *     summary: Get product review statistics
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review stats retrieved successfully
 */
router.get("/:productId/reviews/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
      return;
    }

    const stats = await reviewModel.getReviewStats(productId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review stats",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   post:
 *     summary: Create a product review
 *     tags: [Product Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               orderId:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 */
router.post(
  "/:productId/reviews",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { rating, title, comment, orderId, images } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
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

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
        return;
      }

      // Check if user already reviewed this product
      const hasReviewed = await reviewModel.userHasReviewed(productId, req.user.id);
      if (hasReviewed) {
        res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
        return;
      }

      const reviewData: CreateReviewRequest = {
        productId,
        userId: req.user.id,
        rating,
        title,
        comment,
        orderId,
        images,
      };

      const review = await reviewModel.create(reviewData);

      res.status(201).json({
        success: true,
        data: review,
        message: "Review created successfully",
      });
    } catch (error: any) {
      console.error("Error creating review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create review",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark a review as helpful or not helpful
 *     tags: [Product Reviews]
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
 *               - isHelpful
 *             properties:
 *               isHelpful:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 */
router.post(
  "/reviews/:reviewId/helpful",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { isHelpful } = req.body;

      if (!reviewId) {
        res.status(400).json({
          success: false,
          message: "Review ID is required",
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

      await reviewModel.markHelpful(reviewId, req.user.id, isHelpful);

      res.json({
        success: true,
        message: "Vote recorded successfully",
      });
    } catch (error: any) {
      console.error("Error marking review helpful:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record vote",
        error: error.message,
      });
    }
  }
);

export default router;

