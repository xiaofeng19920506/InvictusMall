import { Router, Response } from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import { authenticateAnyToken, AuthenticatedRequest } from "../middleware/auth";
import { validateImageFile } from "../utils/imageValidation";

const router = Router();

// Configure multer for image uploads (memory storage to forward to external API)
const storage = multer.memoryStorage();

const fileFilter = (
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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload image (Public to all authenticated users)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, GIF, WebP, BMP, or SVG)
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Image uploaded successfully"
 *                 data:
 *                   type: string
 *                   description: URL of the uploaded image
 *                   example: "/images/abc123.jpg"
 *       400:
 *         description: Validation error or no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
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
  "/image",
  authenticateAnyToken,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file uploaded",
        });
      }

      const uploadedFile = req.file;

      // Validate the image file
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

      // Get the external upload URL from environment
      const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";

      if (!externalUploadUrl) {
        console.error("[Upload] FILE_UPLOAD_API_URL not configured");
        return res.status(500).json({
          success: false,
          message: "File upload service not configured",
        });
      }

      // Prepare form data to forward to external upload service
      const formData = new FormData();
      formData.append("file", uploadedFile.buffer, {
        filename: uploadedFile.originalname,
        contentType: uploadedFile.mimetype,
        knownLength: uploadedFile.size,
      });

      try {
        // Forward the file to the external upload service
        const uploadResponse = await fetch(externalUploadUrl, {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("[Upload] Upload failed:", {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
          });

          return res.status(uploadResponse.status || 500).json({
            success: false,
            message: "Failed to upload file to storage",
            error: errorText || `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`,
          });
        }

        const uploadResult: any = await uploadResponse.json();
        const imageUrl = uploadResult.data;

        if (!imageUrl) {
          return res.status(500).json({
            success: false,
            message: "Failed to get image URL from upload service",
            error: "Upload service did not return image URL",
            response: uploadResult,
          });
        }

        // Get user info for logging
        const userId = req.user?.id || req.staff?.id;
        const userEmail = req.user?.email || req.staff?.email;
        const authType = req.authType || "user";

        console.log(`[Upload] Image uploaded successfully by ${authType} ${userEmail} (ID: ${userId})`);

        return res.status(200).json({
          success: true,
          message: "Image uploaded successfully",
          data: imageUrl,
        });
      } catch (fetchError: any) {
        console.error("[Upload] Error calling storage service:", {
          error: fetchError.message,
          stack: fetchError.stack,
          url: externalUploadUrl,
        });

        let errorMessage = "Failed to connect to file upload service";
        if (fetchError.code === "ECONNREFUSED") {
          errorMessage = `Connection refused. The file upload service at ${externalUploadUrl} may be down or unreachable. Please check if the service is running.`;
        } else if (fetchError.code === "ETIMEDOUT") {
          errorMessage = `Connection timeout. The file upload service at ${externalUploadUrl} did not respond in time.`;
        } else if (fetchError.code === "ENOTFOUND") {
          errorMessage = `Host not found. Cannot resolve the address for ${externalUploadUrl}.`;
        }

        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: fetchError.message,
          url: externalUploadUrl,
        });
      }
    } catch (error: any) {
      console.error("[Upload] Unexpected error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: error.message,
      });
    }
  }
);

export default router;

