import { Router, Request, Response } from "express";
import { WishlistModel, CreateWishlistRequest } from "../models/WishlistModel";
import { authenticateUserToken, AuthenticatedRequest } from "../middleware/auth";

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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const wishlists = await wishlistModel.findByUserId(req.user.id);

      res.json({
        success: true,
        data: wishlists,
      });
    } catch (error: any) {
      console.error("Error fetching wishlists:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wishlists",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { name, isPublic } = req.body;

      const wishlistData: CreateWishlistRequest = {
        userId: req.user.id,
        name,
        isPublic,
      };

      const wishlist = await wishlistModel.create(wishlistData);

      res.status(201).json({
        success: true,
        data: wishlist,
        message: "Wishlist created successfully",
      });
    } catch (error: any) {
      console.error("Error creating wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create wishlist",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { wishlistId } = req.params;
      const { name, isPublic } = req.body;

      if (!wishlistId) {
        res.status(400).json({
          success: false,
          message: "Wishlist ID is required",
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

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to update this wishlist",
        });
        return;
      }

      const updated = await wishlistModel.update(wishlistId, { name, isPublic });

      res.json({
        success: true,
        data: updated,
        message: "Wishlist updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update wishlist",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { wishlistId } = req.params;

      if (!wishlistId) {
        res.status(400).json({
          success: false,
          message: "Wishlist ID is required",
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

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to delete this wishlist",
        });
        return;
      }

      await wishlistModel.delete(wishlistId);

      res.json({
        success: true,
        message: "Wishlist deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete wishlist",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { wishlistId } = req.params;

      if (!wishlistId) {
        res.status(400).json({
          success: false,
          message: "Wishlist ID is required",
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

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id && !wishlist.isPublic) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to view this wishlist",
        });
        return;
      }

      const items = await wishlistModel.getItems(wishlistId);

      res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      console.error("Error fetching wishlist items:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wishlist items",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { wishlistId } = req.params;
      const { productId, notes } = req.body;

      if (!wishlistId) {
        res.status(400).json({
          success: false,
          message: "Wishlist ID is required",
        });
        return;
      }

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

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to modify this wishlist",
        });
        return;
      }

      const item = await wishlistModel.addItem(wishlistId, productId, notes);

      res.status(201).json({
        success: true,
        data: item,
        message: "Item added to wishlist successfully",
      });
    } catch (error: any) {
      console.error("Error adding item to wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add item to wishlist",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { wishlistId, productId } = req.params;

      if (!wishlistId || !productId) {
        res.status(400).json({
          success: false,
          message: "Wishlist ID and Product ID are required",
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

      // Verify ownership
      const wishlist = await wishlistModel.findById(wishlistId);
      if (wishlist.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to modify this wishlist",
        });
        return;
      }

      await wishlistModel.removeItem(wishlistId, productId);

      res.json({
        success: true,
        message: "Item removed from wishlist successfully",
      });
    } catch (error: any) {
      console.error("Error removing item from wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove item from wishlist",
        error: error.message,
      });
    }
  }
);

export default router;

