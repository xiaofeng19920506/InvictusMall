import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { StoreModel } from "../../models/StoreModel";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { handleETagValidation } from "../../utils/cacheUtils";

export async function handleGetStoreById(
  req: Request,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      ApiResponseHelper.validationError(res, "Store ID is required");
      return;
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
    let ownerInfo = null;
    try {
      const staffModel = new StaffModel();
      const owner = await staffModel.getOwnerByStoreId(id);
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
      logger.warn("Failed to fetch store owner", { storeId: req.params.id, error });
    }

    ApiResponseHelper.success(res, {
      ...store,
      owner: ownerInfo,
    });
  } catch (error) {
    logger.error("Error fetching store by ID", error, { storeId: req.params.id });
    const statusCode =
      error instanceof Error && "statusCode" in error ? (error as any).statusCode : 500;
    ApiResponseHelper.error(
      res,
      error instanceof Error ? error.message : "Unknown error",
      statusCode,
      error
    );
  }
}

