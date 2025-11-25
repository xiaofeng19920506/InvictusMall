import { Router, Request, Response } from "express";
import { StoreService } from "../services/storeService";
import {
  validateStore,
  validateUpdateStore,
  handleValidationErrors,
} from "../middleware/validation";
import {
  authenticateStaffToken,
  authenticateAnyToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import multer from "multer";
import { handleGetAllStores } from "../services/store/storeListService";
import { handleGetCategories } from "../services/store/storeCategoryService";
import { handleGetStoreById } from "../services/store/storeDetailService";
import { handleCreateStore } from "../services/store/storeCreateService";
import { handleUpdateStore } from "../services/store/storeUpdateService";
import { handleDeleteStore } from "../services/store/storeDeleteService";
import { handleVerifyStore } from "../services/store/storeVerifyService";
import { handleUploadStoreImage } from "../services/store/storeImageService";

const router = Router();
const storeService = new StoreService();

// Configure multer for store image uploads
const storeImageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const uploadStoreImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: storeImageFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get all stores (Public endpoint - no authentication required)
 *     tags: [Stores]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter stores by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search stores by name, description, or location
 *     responses:
 *       200:
 *         description: List of stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 8
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", async (req: Request, res: Response) => {
  await handleGetAllStores(req, res, storeService);
});

/**
 * @swagger
 * /api/stores/categories:
 *   get:
 *     summary: Get all store categories (Public endpoint - no authentication required)
 *     tags: [Stores]
 *     security: []  # No authentication required
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Electronics", "Fashion", "Home & Garden"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/categories", async (req: Request, res: Response) => {
  await handleGetCategories(req, res, storeService);
});

/**
 * @swagger
 * /api/stores/{id}:
 *   get:
 *     summary: Get store by ID (Public endpoint - no authentication required)
 *     tags: [Stores]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", async (req: Request, res: Response) => {
  await handleGetStoreById(req, res, storeService);
});

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStoreRequest'
 *     responses:
 *       201:
 *         description: Store created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticateStaffToken,
  validateStore,
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    await handleCreateStore(req, res, storeService);
  }
);

/**
 * @swagger
 * /api/stores/{id}:
 *   put:
 *     summary: Update a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStoreRequest'
 *     responses:
 *       200:
 *         description: Store updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  validateUpdateStore,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    await handleUpdateStore(req, res, storeService);
  }
);

/**
 * @swagger
 * /api/stores/{id}:
 *   delete:
 *     summary: Delete a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       204:
 *         description: Store deleted successfully
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", async (req: Request, res: Response) => {
  await handleDeleteStore(req, res, storeService);
});

/**
 * @swagger
 * /api/stores/{id}/verify:
 *   put:
 *     summary: Verify a store (Admin only)
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store verified successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id/verify", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleVerifyStore(req, res, storeService);
});

/**
 * @swagger
 * /api/stores/upload-image:
 *   post:
 *     summary: Upload store image (Public to all authenticated users)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/upload-image",
  authenticateAnyToken,
  uploadStoreImage.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    await handleUploadStoreImage(req, res, storeService);
  }
);

export default router;
