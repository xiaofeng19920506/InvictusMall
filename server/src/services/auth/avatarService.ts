import { Request, Response } from "express";
import { UserModel } from "../../models/UserModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { validateImageFile } from "../../utils/imageValidation";
import FormData from "form-data";
import fetch from "node-fetch";

export async function handleUploadAvatar(
  req: Request,
  res: Response,
  userModel: UserModel,
  userId: string
): Promise<void> {
  try {
    if (!req.file) {
      ApiResponseHelper.validationError(res, "No file uploaded");
      return;
    }

    // Perform binary validation on the uploaded file
    const validation = validateImageFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.valid) {
      ApiResponseHelper.validationError(res, validation.error || "Invalid image file");
      return;
    }

    // Get current user to check for existing avatar
    const currentUser = await userModel.getUserById(userId);

    // Delete previous avatar if it exists
    if (currentUser.avatar) {
      try {
        // Extract the image path from the avatar URL
        let imagePath = currentUser.avatar;

        // If it's a full URL, extract just the path
        try {
          const url = new URL(currentUser.avatar);
          imagePath = url.pathname;
        } catch {
          // If it's not a full URL, assume it's already a path
          imagePath = currentUser.avatar.startsWith("/") ? currentUser.avatar : `/${currentUser.avatar}`;
        }

        // Only delete if it's an /images/ path (stored in MinIO)
        if (imagePath.startsWith("/images/")) {
          const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
          const baseUrl = externalUploadUrl.replace("/api/files/upload", "");
          const deleteUrl = `${baseUrl}/api/files/delete?fileName=${encodeURIComponent(imagePath)}`;

          logger.debug(`Attempting to delete previous avatar: ${imagePath}`, { userId: currentUser.id });

          // Call delete API on MinIO storage service
          const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE",
          });

          if (deleteResponse.ok) {
            logger.debug(`Successfully deleted previous avatar: ${imagePath}`, { userId: currentUser.id });
          } else {
            const errorText = await deleteResponse.text();
            logger.warn("Failed to delete previous avatar (continuing with new upload)", {
              path: imagePath,
              status: deleteResponse.status,
              error: errorText,
              userId: currentUser.id,
            });
          }
        } else {
          logger.debug(`Skipping deletion - avatar path is not in MinIO storage: ${imagePath}`, { userId: currentUser.id });
        }
      } catch (deleteError: any) {
        logger.warn("Error deleting previous avatar (continuing with new upload)", {
          error: deleteError,
          avatar: currentUser.avatar,
          userId: currentUser.id,
        });
      }
    }

    // Forward the file to the external MinIO storage API
    const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";

    let uploadResult;
    let avatarUrl;

    try {
      // Create FormData to forward the file
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      logger.debug(`Attempting to upload file to: ${externalUploadUrl}`, {
        fileName: req.file.originalname,
        size: req.file.size,
        userId: currentUser.id,
      });

      logger.debug(`Attempting to upload file to: ${externalUploadUrl}`, {
        fileName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        userId,
      });

      // Forward the file to external API
      const uploadResponse = await fetch(externalUploadUrl, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error("External upload API error", {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText,
          userId,
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
      uploadResult = await uploadResponse.json();
      logger.debug("Upload response received", { uploadResult, userId });
      
      // Extract the image URL from the response
      // Response format: { "data": "/images/...", "status": 200 }
      avatarUrl = uploadResult.data;
      
      if (!avatarUrl) {
        logger.error("Upload response missing data field", { uploadResult, userId });
        ApiResponseHelper.error(res, "Failed to get image URL from upload service", 500);
        return;
      }
    } catch (fetchError: any) {
      logger.error("Error connecting to external upload API", fetchError, {
        url: externalUploadUrl,
        userId,
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
      
      ApiResponseHelper.error(res, errorMessage, 503, fetchError);
      return;
    }

    // Update user's avatar URL in database
    const updatedUser = await userModel.updateAvatar(userId, avatarUrl);

    // Log the activity
    try {
      const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
      await ActivityLogModel.createLog({
        type: "avatar_uploaded",
        message: `User "${userName}" uploaded a new avatar`,
        userId: updatedUser.id,
        userName,
        metadata: {
          userId: updatedUser.id,
          email: updatedUser.email,
          avatarUrl,
        },
      });
    } catch (logError) {
      logger.warn("Failed to log avatar upload", { error: logError, userId: updatedUser.id });
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    ApiResponseHelper.success(res, userWithoutPassword, "Avatar uploaded successfully");
  } catch (error) {
    logger.error("Upload avatar error", error, { userId });
    ApiResponseHelper.error(res, "Failed to upload avatar", 500, error);
  }
}

