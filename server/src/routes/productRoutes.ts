import { Router, Request, Response } from "express";
import { ProductModel } from "../models/ProductModel";
import { CreateProductRequest, UpdateProductRequest } from "../types/product";
import {
  authenticateUserToken,
  authenticateAnyToken,
  AuthenticatedRequest,
  requireStoreOwner,
  checkStoreOwnership,
} from "../middleware/auth";
import { validateImageFile } from "../utils/imageValidation";
import { StoreModel } from "../models/StoreModel";
import { handleETagValidation } from "../utils/cacheUtils";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

const router = Router();

// Configure multer for product image uploads
const productImageFilter = (
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

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: productImageFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
});

// For multiple images
const uploadMultipleProductImages = multer({
  storage: multer.memoryStorage(),
  fileFilter: productImageFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB per file
    files: 10, // Max 10 images
  },
});

/**
 * Get all products for a store (Public endpoint)
 */
router.get("/store/:storeId", async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { isActive, limit, offset } = req.query;

    if (!storeId) {
      return ApiResponseHelper.validationError(res, "Store ID is required");
    }

    // Verify store exists
    const store = await StoreModel.findById(storeId);
    if (!store) {
      return ApiResponseHelper.notFound(res, "Store");
    }

    // Generate ETag based on last modified timestamp for this store's products
    const lastModified = await ProductModel.getLastModifiedTimestamp(storeId);
    const cacheKey = `${storeId}-${isActive || ''}-${limit || ''}-${offset || ''}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    // Use pagination if limit is provided
    if (limit !== undefined) {
      const options: { isActive?: boolean; limit?: number; offset?: number } = {};
      if (isActive !== undefined) {
        options.isActive = isActive === "true";
      }
      if (limit !== undefined) {
        options.limit = parseInt(limit as string) || undefined;
      }
      if (offset !== undefined) {
        options.offset = parseInt(offset as string) || undefined;
      }

      const { products, total } = await ProductModel.findByStoreIdWithPagination(storeId, options);

      return ApiResponseHelper.successWithPagination(res, products, total);
    }

    // Regular fetch without pagination
    const options: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      options.isActive = isActive === "true";
    }

    const products = await ProductModel.findByStoreId(storeId, options);

    return ApiResponseHelper.successWithCount(res, products, products.length);
  } catch (error) {
    logger.error("Failed to fetch products", error, { storeId: req.params.storeId });
    return ApiResponseHelper.error(res, "Failed to fetch products", 500, error);
  }
});

/**
 * Get product by barcode (Public endpoint)
 * IMPORTANT: This route must be before /:id route to avoid path conflicts
 */
router.get("/barcode/:barcode", async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return ApiResponseHelper.validationError(res, "Barcode is required");
    }

    console.log(`[ProductRoutes] 🔍 Searching for product with barcode: ${barcode}`);

    const product = await ProductModel.findByBarcode(barcode);

    if (!product) {
      console.log(`[ProductRoutes] ❌ Product not found with barcode: ${barcode}`);
      return ApiResponseHelper.notFound(res, "Product");
    }

    console.log(`[ProductRoutes] ✅ Product found: ${product.name} (ID: ${product.id})`);

    return ApiResponseHelper.success(res, product);
  } catch (error) {
    logger.error("Error fetching product by barcode", error, { barcode: req.params.barcode });
    return ApiResponseHelper.error(res, "Failed to fetch product", 500, error);
  }
});

/**
 * Get product by ID (Public endpoint)
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Generate ETag based on last modified timestamp for this product
    const lastModified = await ProductModel.getLastModifiedTimestamp();
    const cacheKey = `product-${id}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Create new product (Store owner/admin only)
 */
router.post(
  "/",
  authenticateAnyToken,
  requireStoreOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productData: CreateProductRequest = req.body;

      // Validate required fields
      if (!productData.storeId || !productData.name || productData.price === undefined) {
        return res.status(400).json({
          success: false,
          message: "Store ID, name, and price are required",
        });
      }

      // Verify store exists
      const store = await StoreModel.findById(productData.storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Verify store ownership (admin can access any store, owners only their own)
      const ownershipCheck = await checkStoreOwnership(req, productData.storeId);
      if (!ownershipCheck.authorized) {
        return res.status(403).json({
          success: false,
          message: ownershipCheck.error || "You do not have permission to access this store",
        });
      }

      if (productData.price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price cannot be negative",
        });
      }

      if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock quantity cannot be negative",
        });
      }

      const product = await ProductModel.create(productData);

      return res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully",
      });
    } catch (error) {
      console.error("Error creating product:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Update product (Store owner/admin only)
 */
router.put(
  "/:id",
  authenticateAnyToken,
  requireStoreOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const productData: UpdateProductRequest = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      // Verify product exists
      const existingProduct = await ProductModel.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // TODO: Add authorization check to verify store owner owns this store
      // For now, allow any owner/admin to update products for any store

      if (productData.price !== undefined && productData.price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price cannot be negative",
        });
      }

      if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock quantity cannot be negative",
        });
      }

      const product = await ProductModel.update(id, productData);

      return res.json({
        success: true,
        data: product,
        message: "Product updated successfully",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update product",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Delete product (Store owner/admin only)
 */
router.delete(
  "/:id",
  authenticateAnyToken,
  requireStoreOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      // Verify product exists
      const existingProduct = await ProductModel.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Verify store ownership (admin can access any store, owners only their own)
      const ownershipCheck = await checkStoreOwnership(req, existingProduct.storeId);
      if (!ownershipCheck.authorized) {
        return res.status(403).json({
          success: false,
          message: ownershipCheck.error || "You do not have permission to access this store",
        });
      }

      await ProductModel.delete(id);

      return res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete product",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Upload product image (Public endpoint - accessible to all roles)
 */
router.post(
  "/upload-image",
  uploadProductImage.single("file"),
  async (req: Request, res: Response) => {
    try {
      const uploadedFile = (req as any).file as Express.Multer.File | undefined;
      const { metadata: metadataRaw, productId } = req.body || {};

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
          logger.warn(
            "[Product Upload] Failed to parse metadata, falling back to defaults",
            { error: parseError }
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

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error || "Invalid image file",
        });
      }

      // Forward the file to the external MinIO storage API
      const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";

      let imageUrl;
      let previousImageUrl: string | undefined;

      try {
        // Fetch current product to check for previous image when productId provided
        if (productId && typeof productId === "string") {
          try {
            const currentProduct = await ProductModel.findById(productId);
            previousImageUrl = currentProduct?.imageUrl;
          } catch (fetchProductError) {
            logger.warn(
              "[Product Upload] Unable to fetch current product for previous image cleanup",
              { error: fetchProductError }
            );
          }
        }

        // Create FormData to forward the file
        const formData = new FormData();
        formData.append("file", uploadedFile.buffer, {
          filename: uploadedFile.originalname,
          contentType: uploadedFile.mimetype,
          knownLength: uploadedFile.size,
        });

        // Forward the file to external API
        const uploadResponse = await fetch(externalUploadUrl, {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
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
            const deleteResponse = await fetch(deleteUrl, { method: "DELETE" });
            if (!deleteResponse.ok) {
              logger.warn(
                "[Product Upload] Failed to delete previous image",
                { status: deleteResponse.status }
              );
            }
          } catch (deleteError) {
            logger.warn(
              "[Product Upload] Error deleting previous image",
              { error: deleteError }
            );
          }
        }

        // Save the image URL to the database when a productId is provided
        let updatedProduct = undefined;
        if (productId && typeof productId === "string") {
          try {
            const currentProduct = await ProductModel.findById(productId);
            const existingImageUrls = currentProduct?.imageUrls || (currentProduct?.imageUrl ? [currentProduct.imageUrl] : []);
            const newImageUrls = [...existingImageUrls, imageUrl];
            
            updatedProduct = await ProductModel.update(productId, {
              imageUrls: newImageUrls,
            });
          } catch (updateError) {
            console.error(
              "[Product Upload] Failed to update product imageUrls:",
              updateError
            );
          }
        }

        return res.json({
          success: true,
          data: {
            imageUrl,
            imageUrls: productId ? (await ProductModel.findById(productId))?.imageUrls : [imageUrl],
            metadata,
            product: updatedProduct,
          },
          message: "Image uploaded successfully",
        });
      } catch (fetchError: any) {
        console.error("[Product Upload] Upload error:", fetchError);
        let errorMessage = "Failed to upload image";
        if (fetchError.code === "ENOTFOUND" || fetchError.code === "ECONNREFUSED") {
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
    } catch (error) {
      console.error("[Product Upload] Unexpected error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Upload multiple product images
 */
router.post(
  "/upload-images",
  uploadMultipleProductImages.array("files", 10),
  async (req: Request, res: Response) => {
    try {
      const uploadedFiles = (req as any).files as Express.Multer.File[] | undefined;
      const { productId } = req.body || {};

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No image files uploaded",
        });
      }

      const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
      const uploadedImageUrls: string[] = [];

      // Upload all files
      for (const uploadedFile of uploadedFiles) {
        const validation = validateImageFile(
          uploadedFile.buffer,
          uploadedFile.mimetype,
          uploadedFile.size
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error || `Invalid image file: ${uploadedFile.originalname}`,
          });
        }

        try {
          const formData = new FormData();
          formData.append("file", uploadedFile.buffer, {
            filename: uploadedFile.originalname,
            contentType: uploadedFile.mimetype,
            knownLength: uploadedFile.size,
          });

          const uploadResponse = await fetch(externalUploadUrl, {
            method: "POST",
            body: formData,
            headers: formData.getHeaders(),
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${uploadedFile.originalname}`);
          }

          const uploadResult: any = await uploadResponse.json();
          if (uploadResult.data) {
            uploadedImageUrls.push(uploadResult.data);
          }
        } catch (uploadError: any) {
          logger.error(`Failed to upload ${uploadedFile.originalname}:`, uploadError);
          return res.status(500).json({
            success: false,
            message: `Failed to upload ${uploadedFile.originalname}`,
            error: uploadError.message,
          });
        }
      }

      // Update product with all image URLs if productId is provided
      let updatedProduct = undefined;
      if (productId && typeof productId === "string" && uploadedImageUrls.length > 0) {
        try {
          const currentProduct = await ProductModel.findById(productId);
          const existingImageUrls = currentProduct?.imageUrls || (currentProduct?.imageUrl ? [currentProduct.imageUrl] : []);
          const newImageUrls = [...existingImageUrls, ...uploadedImageUrls];
          
          updatedProduct = await ProductModel.update(productId, {
            imageUrls: newImageUrls,
          });
        } catch (updateError) {
          logger.error("[Product Upload] Failed to update product imageUrls:", updateError);
        }
      }

      return res.json({
        success: true,
        data: {
          imageUrls: uploadedImageUrls,
          product: updatedProduct,
        },
        message: `${uploadedImageUrls.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      logger.error("[Product Upload] Unexpected error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload images",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;

