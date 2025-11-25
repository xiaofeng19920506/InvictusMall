import { Router, Request, Response } from "express";
import { ProductReviewModel, CreateReviewRequest } from "../models/ProductReviewModel";
import { authenticateUserToken, AuthenticatedRequest } from "../middleware/auth";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

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
router.get("/:productId/reviews", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { limit, offset, rating, sortBy } = req.query;

    if (!productId) {
      return ApiResponseHelper.validationError(res, "Product ID is required");
    }

    const result = await reviewModel.findByProductId(productId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      rating: rating ? parseInt(rating as string) : undefined,
      sortBy: sortBy as any,
    });

    return ApiResponseHelper.successWithPagination(res, result.reviews, result.total);
  } catch (error: any) {
    logger.error("Error fetching reviews", error, { productId: req.params.productId });
    return ApiResponseHelper.error(res, "Failed to fetch reviews", 500, error);
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
router.get("/:productId/reviews/stats", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return ApiResponseHelper.validationError(res, "Product ID is required");
    }

    const stats = await reviewModel.getReviewStats(productId);

    return ApiResponseHelper.success(res, stats);
  } catch (error: any) {
    logger.error("Error fetching review stats", error, { productId: req.params.productId });
    return ApiResponseHelper.error(res, "Failed to fetch review stats", 500, error);
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { rating, title, comment, orderId, images } = req.body;

      if (!productId) {
        return ApiResponseHelper.validationError(res, "Product ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      if (!rating || rating < 1 || rating > 5) {
        return ApiResponseHelper.validationError(res, "Rating must be between 1 and 5");
      }

      // Check if user already reviewed this product
      const hasReviewed = await reviewModel.userHasReviewed(productId, req.user.id);
      if (hasReviewed) {
        return ApiResponseHelper.error(res, "You have already reviewed this product", 400);
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

      return ApiResponseHelper.success(res, review, "Review created successfully", 201);
    } catch (error: any) {
      logger.error("Error creating review", error, { userId: req.user?.id, productId: req.params.productId });
      return ApiResponseHelper.error(res, "Failed to create review", 500, error);
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reviewId } = req.params;
      const { isHelpful } = req.body;

      if (!reviewId) {
        return ApiResponseHelper.validationError(res, "Review ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      await reviewModel.markHelpful(reviewId, req.user.id, isHelpful);

      return ApiResponseHelper.success(res, null, "Vote recorded successfully");
    } catch (error: any) {
      logger.error("Error marking review helpful", error, { userId: req.user?.id, reviewId: req.params.reviewId });
      return ApiResponseHelper.error(res, "Failed to record vote", 500, error);
    }
  }
);

export default router;

