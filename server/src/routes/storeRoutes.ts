import { Router, Request, Response } from "express";
import { StoreService } from "../services/storeService";
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
import { validateImageFile } from "../utils/imageValidation";
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
    const { category, search } = req.query;

    let stores;
    if (search && typeof search === "string") {
      stores = await storeService.searchStores(search);
    } else if (category && typeof category === "string") {
      stores = await storeService.getStoresByCategory(category);
    } else {
      stores = await storeService.getAllStores();
    }

    return res.json({
      success: true,
      data: stores,
      count: stores.length,
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

    const store = await storeService.getStoreById(id);
    return res.json({
      success: true,
      data: store,
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
      const store = await storeService.createStore(req.body);

      // Log the activity
      await ActivityLogModel.createLog({
        type: "store_created",
        message: `New store "${store.name}" has been added`,
        storeName: store.name,
        storeId: store.id,
        metadata: {
          categories: store.category,
          rating: store.rating,
          isVerified: store.isVerified,
        },
      });

      return res.status(201).json({
        success: true,
        data: store,
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

      const store = await storeService.updateStore(id, req.body);

      // Log the activity
      await ActivityLogModel.createLog({
        type: "store_updated",
        message: `Store "${store.name}" information has been updated`,
        storeName: store.name,
        storeId: store.id,
        metadata: {
          updatedFields: Object.keys(req.body),
          categories: store.category,
          rating: store.rating,
          isVerified: store.isVerified,
        },
      });

      return res.json({
        success: true,
        data: store,
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
    await ActivityLogModel.createLog({
      type: "store_deleted",
      message: `Store "${storeToDelete.name}" has been deleted`,
      storeName: storeToDelete.name,
      storeId: storeToDelete.id,
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
      await ActivityLogModel.createLog({
        type: "store_verified",
        message: `Store "${store.name}" has been verified by admin ${user.email}`,
        storeName: store.name,
        storeId: store.id,
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
      console.log("[Store Upload] Multer single file:",
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

      try {
        // Create FormData to forward the file
        const formData = new FormData();
        formData.append("file", uploadedFile.buffer, {
          filename: uploadedFile.originalname,
          contentType: uploadedFile.mimetype,
          knownLength: uploadedFile.size,
        });

        formData.append("metadata", JSON.stringify(metadata));

        if (storeId) {
          formData.append("storeId", storeId);
        }
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

      return res.json({
        success: true,
        data: {
          imageUrl,
          metadata,
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
