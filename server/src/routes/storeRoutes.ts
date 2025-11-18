import { Router, Request, Response } from "express";
import { StoreService } from "../services/storeService";
import { StoreModel } from "../models/StoreModel";
import { StaffModel } from "../models/StaffModel";
import {
  validateStore,
  validateUpdateStore,
  handleValidationErrors,
} from "../middleware/validation";
import { ActivityLogModel } from "../models/ActivityLogModel";
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { getUserNameFromRequest, getUserIdFromRequest } from "../utils/activityLogHelper";
import { validateImageFile } from "../utils/imageValidation";
import { handleETagValidation } from "../utils/cacheUtils";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

const router = Router();
// Use real database service now that database is connected
const storeService = new StoreService();

// Configure multer for store image uploads (memory storage for external upload)

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
// Public endpoint - no authentication required for browsing stores
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, search, limit, offset } = req.query;

    // Generate ETag based on last modified timestamp
    const lastModified = await StoreModel.getLastModifiedTimestamp();
    const cacheKey = `${category || ''}-${search || ''}-${limit || ''}-${offset || ''}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    // Use pagination if limit is provided (typically for admin app)
    if (limit !== undefined && !search && !category) {
      const { stores, total } = await StoreModel.findAllWithPagination({
        limit: parseInt(limit as string) || undefined,
        offset: offset !== undefined ? parseInt(offset as string) : undefined,
      });

      // Add owner information to each store
      const staffModel = new StaffModel();
      const storesWithOwner = await Promise.all(
        stores.map(async (store) => {
          try {
            const owner = await staffModel.getOwnerByStoreId(store.id);
            const ownerInfo = owner ? {
              id: owner.id,
              firstName: owner.firstName,
              lastName: owner.lastName,
              email: owner.email,
              phoneNumber: owner.phoneNumber,
              role: owner.role,
            } : null;
            return {
              ...store,
              owner: ownerInfo,
            } as any;
          } catch (error) {
            // Silently fail - owner info is optional
            return {
              ...store,
              owner: null,
            } as any;
          }
        })
      );

      return res.json({
        success: true,
        data: storesWithOwner,
        count: storesWithOwner.length,
        total,
      });
    }

    // Regular fetch without pagination (for client app or when category/search is provided)
    let stores;
    if (search && typeof search === "string") {
      stores = await storeService.searchStores(search);
    } else if (category && typeof category === "string") {
      stores = await storeService.getStoresByCategory(category);
    } else {
      stores = await storeService.getAllStores();
    }

    // Add owner information to each store
    const staffModel = new StaffModel();
    const storesWithOwner = await Promise.all(
      stores.map(async (store) => {
        try {
          const owner = await staffModel.getOwnerByStoreId(store.id);
          const ownerInfo = owner ? {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
            phoneNumber: owner.phoneNumber,
            role: owner.role,
          } : null;
          return {
            ...store,
            owner: ownerInfo,
          } as any;
        } catch (error) {
          // Silently fail - owner info is optional
          return {
            ...store,
            owner: null,
          } as any;
        }
      })
    );

    return res.json({
      success: true,
      data: storesWithOwner,
      count: storesWithOwner.length,
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
      error: error instanceof Error ? error.message : "Unknown error",
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });
  }
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
// Public endpoint - no authentication required
router.get("/categories", async (req: Request, res: Response) => {
  try {
    // Generate ETag based on last modified timestamp
    const lastModified = await StoreModel.getLastModifiedTimestamp();
    const cacheKey = 'store-categories';
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    const categories = await storeService.getCategories();
    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error instanceof Error ? error.message : "Unknown error",
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });
  }
});

// All specific routes must come before the /:id route to avoid route conflicts
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
// Public endpoint - no authentication required for viewing store details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    // Generate ETag based on last modified timestamp
    const lastModified = await StoreModel.getLastModifiedTimestamp();
    const cacheKey = `store-${id}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    const store = await storeService.getStoreById(id);
    
    // Get store owner information
    let owner = null;
    let ownerInfo = null;
    try {
      const staffModel = new StaffModel();
      owner = await staffModel.getOwnerByStoreId(id);
      if (owner) {
        ownerInfo = {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          role: owner.role,
        };
      }
    } catch (error) {
      // Silently fail - owner info is optional
      console.warn("Failed to fetch store owner:", error);
    }
    
    return res.json({
      success: true,
      data: {
        ...store,
        owner: ownerInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching store by ID:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? (error as any).statusCode
        : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });
  }
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
 *           example:
 *             name: "Tech Store"
 *             description: "Latest technology and gadgets"
 *             category: ["Electronics", "Technology"]
 *             rating: 4.5
 *             reviewCount: 100
 *             imageUrl: "https://example.com/image.jpg"
 *             isVerified: true
 *             location:
 *               - streetAddress: "123 Tech St"
 *                 city: "San Francisco"
 *                 stateProvince: "CA"
 *                 zipCode: "94102"
 *                 country: "USA"
 *             productsCount: 500
 *             establishedYear: 2020
 *             discount: "10% OFF"
 *             membership:
 *               type: "premium"
 *               benefits: ["Enhanced visibility", "Analytics dashboard"]
 *               discountPercentage: 10
 *               prioritySupport: true
 *     responses:
 *       201:
 *         description: Store created successfully
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
 *                 message:
 *                   type: string
 *                   example: "Store created successfully"
 *       400:
 *         description: Validation error
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
router.post(
  "/",
  validateStore,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ownerId, ...storeData } = req.body;
      
      // Validate owner exists and has the 'owner' role before creating store
      const staffModel = new StaffModel();
      const owner = await staffModel.getStaffById(ownerId);
      
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Store owner not found",
        });
      }
      
      if (owner.role !== 'owner') {
        return res.status(400).json({
          success: false,
          message: "Selected staff member must have the 'owner' role",
        });
      }

      const store = await storeService.createStore(storeData);

      // Link the owner to the store
      try {
        await staffModel.updateStaff(ownerId, { storeId: store.id });
      } catch (ownerError) {
        // If linking fails, we should rollback the store creation
        // For now, log the error - in production you might want to implement transaction rollback
        console.error("Error linking owner to store:", ownerError);
        return res.status(500).json({
          success: false,
          message: "Store created but failed to link owner. Please update the store manually.",
          error: ownerError instanceof Error ? ownerError.message : "Unknown error",
        });
      }

      // Fetch the created store with owner information included
      let storeWithOwner = { ...store };
      try {
        const owner = await staffModel.getOwnerByStoreId(store.id);
        const ownerInfo = owner ? {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          role: owner.role,
        } : null;
        storeWithOwner = {
          ...store,
          owner: ownerInfo,
        } as any;
      } catch (error) {
        // Silently fail - owner info is optional
        console.warn("Failed to fetch store owner after creation:", error);
      }

      // Log the activity
      const userId = getUserIdFromRequest(req as AuthenticatedRequest);
      const userName = await getUserNameFromRequest(req as AuthenticatedRequest);
      await ActivityLogModel.createLog({
        type: "store_created",
        message: `New store "${store.name}" has been added`,
        storeName: store.name,
        storeId: store.id,
        userId,
        userName,
        metadata: {
          categories: store.category,
          rating: store.rating,
          isVerified: store.isVerified,
          ownerId: ownerId || null,
        },
      });

      return res.status(201).json({
        success: true,
        data: storeWithOwner,
        message: "Store created successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create store",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
 *           example:
 *             name: "Updated Tech Store"
 *             rating: 4.8
 *             membership:
 *               type: "platinum"
 *               benefits: ["Priority listing", "24/7 support"]
 *               discountPercentage: 20
 *               prioritySupport: true
 *     responses:
 *       200:
 *         description: Store updated successfully
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
 *                 message:
 *                   type: string
 *                   example: "Store updated successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
router.put(
  "/:id",
  validateUpdateStore,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required",
        });
      }

      const { ownerId, ...storeUpdateData } = req.body;
      const store = await storeService.updateStore(id, storeUpdateData);

      // Handle owner change if ownerId is provided
      if (ownerId !== undefined) {
        try {
          const staffModel = new StaffModel();
          
          // Get current owner
          const currentOwner = await staffModel.getOwnerByStoreId(id);
          
          // If there's a current owner and it's different from the new owner, unlink the current owner
          if (currentOwner && currentOwner.id !== ownerId) {
            await staffModel.updateStaff(currentOwner.id, { storeId: undefined });
          }
          
          // If a new owner is specified, link them to the store
          if (ownerId) {
            const newOwner = await staffModel.getStaffById(ownerId);
            if (newOwner) {
              // Verify the new owner has the 'owner' role
              if (newOwner.role !== 'owner') {
                console.warn(`Staff member ${ownerId} is not an owner, skipping store assignment`);
              } else {
                // Update the new owner's storeId to link them to the store
                await staffModel.updateStaff(ownerId, { storeId: id });
              }
            } else {
              console.warn(`Owner with ID ${ownerId} not found, skipping store assignment`);
            }
          }
        } catch (ownerError) {
          // Log the error but don't fail the store update
          console.error("Error updating store owner:", ownerError);
        }
      }

      // Fetch the updated store with owner information included
      let storeWithOwner = { ...store };
      try {
        const staffModel = new StaffModel();
        const owner = await staffModel.getOwnerByStoreId(id);
        const ownerInfo = owner ? {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          role: owner.role,
        } : null;
        storeWithOwner = {
          ...store,
          owner: ownerInfo,
        } as any;
      } catch (error) {
        // Silently fail - owner info is optional
        console.warn("Failed to fetch store owner after update:", error);
      }

      // Log the activity
      const userId = getUserIdFromRequest(req as AuthenticatedRequest);
      const userName = await getUserNameFromRequest(req as AuthenticatedRequest);
      await ActivityLogModel.createLog({
        type: "store_updated",
        message: `Store "${store.name}" information has been updated`,
        storeName: store.name,
        storeId: store.id,
        userId,
        userName,
        metadata: {
          updatedFields: Object.keys(req.body),
          categories: store.category,
          rating: store.rating,
          isVerified: store.isVerified,
          ownerId: ownerId !== undefined ? ownerId : undefined,
        },
      });

      return res.json({
        success: true,
        data: storeWithOwner,
        message: "Store updated successfully",
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && "statusCode" in error
          ? (error as any).statusCode
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    // Get store info before deleting for logging
    const storeToDelete = await storeService.getStoreById(id);

    await storeService.deleteStore(id);

    // Log the activity
    const userId = getUserIdFromRequest(req as AuthenticatedRequest);
    const userName = await getUserNameFromRequest(req as AuthenticatedRequest);
    await ActivityLogModel.createLog({
      type: "store_deleted",
      message: `Store "${storeToDelete.name}" has been deleted`,
      storeName: storeToDelete.name,
      storeId: storeToDelete.id,
      userId,
      userName,
      metadata: {
        deletedAt: new Date().toISOString(),
        categories: storeToDelete.category,
        rating: storeToDelete.rating,
      },
    });

    return res.status(204).send();
  } catch (error) {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? (error as any).statusCode
        : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
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
 *                 message:
 *                   type: string
 *                   example: "Store verified successfully"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id/verify",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Only admin can verify stores
      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only administrators can verify stores",
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required",
        });
      }

      // Update store verification status
      const store = await storeService.updateStore(id, { isVerified: true });

      // Log the activity
      const userName = await getUserNameFromRequest(req);
      await ActivityLogModel.createLog({
        type: "store_verified",
        message: `Store "${store.name}" has been verified`,
        storeName: store.name,
        storeId: store.id,
        userId: user.id,
        userName,
        metadata: {
          verifiedBy: user.id,
          verifiedAt: new Date().toISOString(),
        },
      });

      return res.json({
        success: true,
        data: store,
        message: "Store verified successfully",
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && "statusCode" in error
          ? (error as any).statusCode
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

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
 * /api/stores/upload-image:
 *   post:
 *     summary: Upload store image
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imageUrl:
 *                   type: string
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/upload-image",
  authenticateStaffToken,
  uploadStoreImage.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("[Store Upload] Request headers:", req.headers);
      const uploadedFile = (req as any).file as Express.Multer.File | undefined;

      const { metadata: metadataRaw, storeId } = req.body || {};
      console.log("[Store Upload] Request body fields:", {
        metadataRaw,
        storeId,
      });
      console.log(
        "[Store Upload] Multer single file:",
        uploadedFile
          ? {
              originalname: uploadedFile.originalname,
              mimetype: uploadedFile.mimetype,
              size: uploadedFile.size,
            }
          : null
      );

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: "No image file uploaded",
        });
      }

      let metadata: {
        originalName: string;
        mimeType: string;
        size: number;
        [key: string]: unknown;
      } | null = null;

      if (typeof metadataRaw === "string") {
        try {
          metadata = JSON.parse(metadataRaw);
        } catch (parseError) {
          console.warn(
            "[Store Upload] Failed to parse metadata, falling back to defaults:",
            parseError
          );
        }
      } else if (metadataRaw && typeof metadataRaw === "object") {
        metadata = metadataRaw as any;
      }

      if (!metadata) {
        metadata = {
          originalName: uploadedFile.originalname,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size,
        };
      }

      const validation = validateImageFile(
        uploadedFile.buffer,
        uploadedFile.mimetype,
        uploadedFile.size
      );
      console.log("[Store Upload] Validation result:", validation);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error || "Invalid image file",
        });
      }

      // Forward the file to the external MinIO storage API only after validation passes
      const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
      console.log("[Store Upload] External upload URL:", externalUploadUrl);

      let imageUrl;
      let previousImageUrl: string | undefined;

      try {
        // Fetch current store to check for previous image when storeId provided
        if (storeId && typeof storeId === "string") {
          try {
            const currentStore = await storeService.getStoreById(storeId);
            previousImageUrl = currentStore?.imageUrl;
          } catch (fetchStoreError) {
            console.warn("[Store Upload] Unable to fetch current store for previous image cleanup:", fetchStoreError);
          }
        }

        // Create FormData to forward the file
        const formData = new FormData();
        formData.append("file", uploadedFile.buffer, {
          filename: uploadedFile.originalname,
          contentType: uploadedFile.mimetype,
          knownLength: uploadedFile.size,
        });

        // Do not forward additional metadata to the external service to keep compatibility
        console.log("[Store Upload] Forwarding file to storage service...");

        // Forward the file to external API
        const uploadResponse = await fetch(externalUploadUrl, {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });
        console.log(
          "[Store Upload] Storage response:",
          uploadResponse.status,
          uploadResponse.statusText
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("[Store Upload] Upload failed:", {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            body: errorText,
          });
          return res.status(uploadResponse.status || 500).json({
            success: false,
            message: "Failed to upload file to storage",
            error:
              errorText ||
              `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`,
          });
        }

        // Parse the response to get the image URL
        const uploadResult: any = await uploadResponse.json();
        console.log("[Store Upload] Parsed response:", uploadResult);

        // Extract the image URL from the response
        // Response format: { "data": "/images/...", "status": 200 }
        imageUrl = uploadResult.data;

        if (!imageUrl) {
          return res.status(500).json({
            success: false,
            message: "Failed to get image URL from upload service",
            error: "Response did not contain image URL in data field",
            response: uploadResult,
          });
        }

        // Delete previous image if applicable
        if (previousImageUrl && previousImageUrl.startsWith("/images/")) {
          try {
            const storageBaseUrl =
              process.env.FILE_STORAGE_BASE_URL ||
              externalUploadUrl.replace("/api/files/upload", "");
            const deleteUrl = `${storageBaseUrl}/api/files/delete?fileName=${encodeURIComponent(previousImageUrl)}`;
            console.log("[Store Upload] Deleting previous image:", previousImageUrl);
            const deleteResponse = await fetch(deleteUrl, { method: "DELETE" });
            if (!deleteResponse.ok) {
              const deleteText = await deleteResponse.text();
              console.warn("[Store Upload] Failed to delete previous image:", {
                status: deleteResponse.status,
                body: deleteText,
              });
            }
          } catch (deleteError) {
            console.warn("[Store Upload] Error deleting previous image:", deleteError);
          }
        }

      } catch (fetchError: any) {
        console.error("[Store Upload] Error calling storage service:", {
          message: fetchError.message,
          code: fetchError.code,
          errno: fetchError.errno,
          type: fetchError.type,
        });
        // Provide more specific error messages
        let errorMessage = "Failed to connect to file upload service";
        if (fetchError.code === "ECONNREFUSED") {
          errorMessage = `Connection refused. The file upload service at ${externalUploadUrl} may be down or unreachable. Please check if the service is running.`;
        } else if (fetchError.code === "ETIMEDOUT") {
          errorMessage = `Connection timeout. The file upload service at ${externalUploadUrl} did not respond in time.`;
        } else if (fetchError.code === "ENOTFOUND") {
          errorMessage = `Host not found. Cannot resolve the address for ${externalUploadUrl}.`;
        }

        return res.status(503).json({
          success: false,
          message: errorMessage,
          error: fetchError.message,
          code: fetchError.code,
          url: externalUploadUrl,
        });
      }

      // Save the image URL to the database when a storeId is provided
      let updatedStore = undefined;
      if (storeId && typeof storeId === "string") {
        try {
          updatedStore = await storeService.updateStore(storeId, {
            imageUrl,
          });
        } catch (updateError) {
          console.error("[Store Upload] Failed to update store imageUrl:", {
            storeId,
            error: updateError,
          });
        }
      }

      return res.json({
        success: true,
        data: {
          imageUrl,
          metadata,
          store: updatedStore,
        },
        message: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("[Store Upload] Unexpected error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
