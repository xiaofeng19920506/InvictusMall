import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { StoreModel } from "../../models/StoreModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { handleETagValidation } from "../../utils/cacheUtils";

export async function handleGetCategories(
  req: Request,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    // Generate ETag based on last modified timestamp
    const lastModified = await StoreModel.getLastModifiedTimestamp();
    const cacheKey = "store-categories";

    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    const categories = await storeService.getCategories();
    ApiResponseHelper.success(res, categories);
  } catch (error) {
    logger.error("Error fetching categories", error);
    ApiResponseHelper.error(res, "Failed to fetch categories", 500, error);
  }
}

