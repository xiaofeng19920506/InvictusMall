import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { validateImageFile } from "../../utils/imageValidation";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import FormData from "form-data";
import fetch from "node-fetch";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleUploadStoreImage(
  req: AuthenticatedRequest,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    logger.debug("[Store Upload] Request received", {
      hasFile: !!(req as any).file,
      storeId: req.body?.storeId,
    });
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;

    const { metadata: metadataRaw, storeId } = req.body || {};

    if (!uploadedFile) {
      ApiResponseHelper.validationError(res, "No image file uploaded");
      return;
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
        logger.warn("[Store Upload] Failed to parse metadata, falling back to defaults", {
          parseError,
        });
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

    const validation = validateImageFile(uploadedFile.buffer, uploadedFile.mimetype, uploadedFile.size);

    if (!validation.valid) {
      ApiResponseHelper.validationError(res, validation.error || "Invalid image file");
      return;
    }

    // Forward the file to the external MinIO storage API only after validation passes
    const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";

    let imageUrl: string;
    let previousImageUrl: string | undefined;

    try {
      // Fetch current store to check for previous image when storeId provided
      if (storeId && typeof storeId === "string") {
        try {
          const currentStore = await storeService.getStoreById(storeId);
          previousImageUrl = currentStore?.imageUrl;
        } catch (fetchStoreError) {
          logger.warn("[Store Upload] Unable to fetch current store for previous image cleanup", {
            storeId,
            fetchStoreError,
          });
        }
      }

      // Create FormData to forward the file
      const formData = new FormData();
      formData.append("file", uploadedFile.buffer, {
        filename: uploadedFile.originalname,
        contentType: uploadedFile.mimetype,
        knownLength: uploadedFile.size,
      });

      logger.debug("[Store Upload] Forwarding file to storage service", { storeId });

      // Forward the file to external API
      const uploadResponse = await fetch(externalUploadUrl, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });
      logger.debug("[Store Upload] Storage response", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error("[Store Upload] Upload failed", undefined, {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          body: errorText,
        });
        ApiResponseHelper.error(
          res,
          "Failed to upload file to storage",
          uploadResponse.status || 500,
          errorText || `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
        );
        return;
      }

      // Parse the response to get the image URL
      const uploadResult: any = await uploadResponse.json();
      logger.debug("[Store Upload] Parsed response", { uploadResult });

      // Extract the image URL from the response
      // Response format: { "data": "/images/...", "status": 200 }
      imageUrl = uploadResult.data;

      if (!imageUrl) {
        ApiResponseHelper.error(res, "Failed to get image URL from upload service", 500, {
          error: "Response did not contain image URL in data field",
          response: uploadResult,
        });
        return;
      }

      // Delete previous image if applicable
      if (previousImageUrl && previousImageUrl.startsWith("/images/")) {
        try {
          const storageBaseUrl =
            process.env.FILE_STORAGE_BASE_URL ||
            externalUploadUrl.replace("/api/files/upload", "");
          const deleteUrl = `${storageBaseUrl}/api/files/delete?fileName=${encodeURIComponent(previousImageUrl)}`;
          logger.debug("[Store Upload] Deleting previous image", { previousImageUrl });
          const deleteResponse = await fetch(deleteUrl, { method: "DELETE" });
          if (!deleteResponse.ok) {
            const deleteText = await deleteResponse.text();
            logger.warn("[Store Upload] Failed to delete previous image", {
              status: deleteResponse.status,
              body: deleteText,
              previousImageUrl,
            });
          }
        } catch (deleteError) {
          logger.warn("[Store Upload] Error deleting previous image", {
            deleteError,
            previousImageUrl,
          });
        }
      }
    } catch (fetchError: any) {
      logger.error("[Store Upload] Error calling storage service", fetchError, {
        code: fetchError.code,
        errno: fetchError.errno,
        type: fetchError.type,
        url: externalUploadUrl,
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

      ApiResponseHelper.error(res, errorMessage, 503, {
        error: fetchError.message,
        code: fetchError.code,
        url: externalUploadUrl,
      });
      return;
    }

    // Save the image URL to the database when a storeId is provided
    let updatedStore = undefined;
    if (storeId && typeof storeId === "string") {
      try {
        updatedStore = await storeService.updateStore(storeId, {
          imageUrl,
        });
      } catch (updateError) {
        logger.error("[Store Upload] Failed to update store imageUrl", updateError, { storeId });
      }
    }

    ApiResponseHelper.success(
      res,
      {
        imageUrl,
        metadata,
        store: updatedStore,
      },
      "Image uploaded successfully"
    );
  } catch (error) {
    logger.error("[Store Upload] Unexpected error", error, { userId: req.user?.id });
    ApiResponseHelper.error(res, "Failed to upload image", 500, error);
  }
}

