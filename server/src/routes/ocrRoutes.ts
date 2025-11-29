import { Router, Response } from "express";
import multer from "multer";
import { authenticateStaffToken, AuthenticatedRequest } from "../middleware/auth";
import { validateImageFile } from "../utils/imageValidation";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { extractTextFromImage, parseProductInfoFromText } from "../services/ocrService";

const router = Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
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
 * /api/ocr/extract:
 *   post:
 *     summary: Extract text from image using OCR
 *     tags: [OCR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to process
 *     responses:
 *       200:
 *         description: Text extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     parsed:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         barcode:
 *                           type: string
 *                         price:
 *                           type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/extract",
  authenticateStaffToken,
  upload.single("image"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return ApiResponseHelper.validationError(res, "No image file uploaded");
      }

      const uploadedFile = req.file;

      // Validate the image file
      const validation = validateImageFile(
        uploadedFile.buffer,
        uploadedFile.mimetype,
        uploadedFile.size
      );

      if (!validation.valid) {
        return ApiResponseHelper.validationError(
          res,
          validation.error || "Invalid image file"
        );
      }

      logger.info("OCR request received", {
        staffId: req.staff?.id,
        fileSize: uploadedFile.size,
        mimetype: uploadedFile.mimetype,
      });

      // Perform OCR
      const ocrResult = await extractTextFromImage(uploadedFile.buffer, {
        language: "eng+chi_sim", // English + Simplified Chinese
      });

      // Parse product information from extracted text
      const parsedInfo = parseProductInfoFromText(ocrResult.text);

      logger.info("OCR completed", {
        staffId: req.staff?.id,
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
        hasBarcode: !!parsedInfo.barcode,
        hasName: !!parsedInfo.name,
        hasPrice: !!parsedInfo.price,
      });

      return ApiResponseHelper.success(
        res,
        {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          lines: ocrResult.lines,
          words: ocrResult.words,
          parsed: parsedInfo,
        },
        "Text extracted successfully"
      );
    } catch (error: any) {
      logger.error("OCR processing error", error, {
        staffId: req.staff?.id,
      });
      return ApiResponseHelper.error(
        res,
        "Failed to extract text from image",
        500,
        error
      );
    }
  }
);

export default router;

