import { Router, Request, Response } from "express";
import { ProductModel } from "../models/ProductModel";
import { CreateProductRequest, UpdateProductRequest } from "../types/product";
import {
  authenticateUserToken,
  authenticateAnyToken,
  AuthenticatedRequest,
  requireStoreOwner,
} from "../middleware/auth";
import { validateImageFile } from "../utils/imageValidation";
import { StoreModel } from "../models/StoreModel";
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

/**
 * Get all products for a store (Public endpoint)
 */
router.get("/store/:storeId", async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { isActive, limit, offset } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    // Verify store exists
    const store = await StoreModel.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
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

      return res.json({
        success: true,
        data: products,
        count: products.length,
        total,
      });
    }

    // Regular fetch without pagination
    const options: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      options.isActive = isActive === "true";
    }

    const products = await ProductModel.findByStoreId(storeId, options);

    return res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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

      // TODO: Add authorization check to verify store owner owns this store
      // For now, allow any store_owner/admin to create products for any store

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
      // For now, allow any store_owner/admin to update products for any store

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

      // TODO: Add authorization check to verify store owner owns this store
      // For now, allow any store_owner/admin to delete products for any store

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
 * Upload product image (Store owner/admin only)
 */
router.post(
  "/upload-image",
  authenticateAnyToken,
  requireStoreOwner,
  uploadProductImage.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
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
          console.warn(
            "[Product Upload] Failed to parse metadata, falling back to defaults:",
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
            console.warn(
              "[Product Upload] Unable to fetch current product for previous image cleanup:",
              fetchProductError
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
              console.warn(
                "[Product Upload] Failed to delete previous image:",
                deleteResponse.status
              );
            }
          } catch (deleteError) {
            console.warn(
              "[Product Upload] Error deleting previous image:",
              deleteError
            );
          }
        }

        // Save the image URL to the database when a productId is provided
        let updatedProduct = undefined;
        if (productId && typeof productId === "string") {
          try {
            updatedProduct = await ProductModel.update(productId, {
              imageUrl,
            });
          } catch (updateError) {
            console.error(
              "[Product Upload] Failed to update product imageUrl:",
              updateError
            );
          }
        }

        return res.json({
          success: true,
          data: {
            imageUrl,
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

export default router;

