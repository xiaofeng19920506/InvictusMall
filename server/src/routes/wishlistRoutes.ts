import { Router, Request, Response } from "express";
import { WishlistModel, CreateWishlistRequest } from "../models/WishlistModel";
import { authenticateUserToken, AuthenticatedRequest } from "../middleware/auth";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();
const wishlistModel = new WishlistModel();

/**
 * @swagger
 * /api/wishlists:
 *   get:
 *     summary: Get user's wishlists
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlists retrieved successfully
 */
router.get(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const wishlists = await wishlistModel.findByUserId(req.user.id);

      return ApiResponseHelper.success(res, wishlists);
    } catch (error: any) {
      logger.error("Error fetching wishlists", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch wishlists", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists:
 *   post:
 *     summary: Create a new wishlist
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Wishlist created successfully
 */
router.post(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const { name, isPublic } = req.body;

      const wishlistData: CreateWishlistRequest = {
        userId: req.user.id,
        name,
        isPublic,
      };

      const wishlist = await wishlistModel.create(wishlistData);

      return ApiResponseHelper.success(res, wishlist, "Wishlist created successfully", 201);
    } catch (error: any) {
      logger.error("Error creating wishlist", error, { userId: req.user?.id, name: req.body.name });
      return ApiResponseHelper.error(res, "Failed to create wishlist", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists/{wishlistId}:
 *   put:
 *     summary: Update a wishlist
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wishlistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wishlist updated successfully
 */
router.put(
  "/:wishlistId",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wishlistId } = req.params;
      const { name, isPublic } = req.body;

      if (!wishlistId) {
        return ApiResponseHelper.validationError(res, "Wishlist ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        return ApiResponseHelper.forbidden(res, "You don't have permission to update this wishlist");
      }

      const updated = await wishlistModel.update(wishlistId, { name, isPublic });

      return ApiResponseHelper.success(res, updated, "Wishlist updated successfully");
    } catch (error: any) {
      logger.error("Error updating wishlist", error, { userId: req.user?.id, wishlistId: req.params.wishlistId });
      return ApiResponseHelper.error(res, "Failed to update wishlist", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists/{wishlistId}:
 *   delete:
 *     summary: Delete a wishlist
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wishlistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wishlist deleted successfully
 */
router.delete(
  "/:wishlistId",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wishlistId } = req.params;

      if (!wishlistId) {
        return ApiResponseHelper.validationError(res, "Wishlist ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        return ApiResponseHelper.forbidden(res, "You don't have permission to delete this wishlist");
      }

      await wishlistModel.delete(wishlistId);

      return ApiResponseHelper.success(res, null, "Wishlist deleted successfully");
    } catch (error: any) {
      logger.error("Error deleting wishlist", error, { userId: req.user?.id, wishlistId: req.params.wishlistId });
      return ApiResponseHelper.error(res, "Failed to delete wishlist", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists/{wishlistId}/items:
 *   get:
 *     summary: Get wishlist items
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wishlistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wishlist items retrieved successfully
 */
router.get(
  "/:wishlistId/items",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wishlistId } = req.params;

      if (!wishlistId) {
        return ApiResponseHelper.validationError(res, "Wishlist ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id && !wishlist.isPublic) {
        return ApiResponseHelper.forbidden(res, "You don't have permission to view this wishlist");
      }

      const items = await wishlistModel.getItems(wishlistId);

      return ApiResponseHelper.success(res, items);
    } catch (error: any) {
      logger.error("Error fetching wishlist items", error, { userId: req.user?.id, wishlistId: req.params.wishlistId });
      return ApiResponseHelper.error(res, "Failed to fetch wishlist items", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists/{wishlistId}/items:
 *   post:
 *     summary: Add item to wishlist
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wishlistId
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
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item added to wishlist successfully
 */
router.post(
  "/:wishlistId/items",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wishlistId } = req.params;
      const { productId, notes } = req.body;

      if (!wishlistId) {
        return ApiResponseHelper.validationError(res, "Wishlist ID is required");
      }

      if (!productId) {
        return ApiResponseHelper.validationError(res, "Product ID is required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        return ApiResponseHelper.forbidden(res, "You don't have permission to modify this wishlist");
      }

      const item = await wishlistModel.addItem(wishlistId, productId, notes);

      return ApiResponseHelper.success(res, item, "Item added to wishlist successfully", 201);
    } catch (error: any) {
      logger.error("Error adding item to wishlist", error, { userId: req.user?.id, wishlistId: req.params.wishlistId, productId: req.body.productId });
      return ApiResponseHelper.error(res, "Failed to add item to wishlist", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/wishlists/{wishlistId}/items/{productId}:
 *   delete:
 *     summary: Remove item from wishlist
 *     tags: [Wishlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wishlistId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from wishlist successfully
 */
router.delete(
  "/:wishlistId/items/:productId",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wishlistId, productId } = req.params;

      if (!wishlistId || !productId) {
        return ApiResponseHelper.validationError(res, "Wishlist ID and Product ID are required");
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        return ApiResponseHelper.forbidden(res, "You don't have permission to modify this wishlist");
      }

      await wishlistModel.removeItem(wishlistId, productId);

      return ApiResponseHelper.success(res, null, "Item removed from wishlist successfully");
    } catch (error: any) {
      logger.error("Error removing item from wishlist", error, { userId: req.user?.id, wishlistId: req.params.wishlistId, productId: req.params.productId });
      return ApiResponseHelper.error(res, "Failed to remove item from wishlist", 500, error);
    }
  }
);

export default router;

