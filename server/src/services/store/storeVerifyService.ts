import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleVerifyStore(
  req: AuthenticatedRequest,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Only admin can verify stores
    if (user.role !== "admin") {
      ApiResponseHelper.forbidden(res, "Only administrators can verify stores");
      return;
    }

    if (!id) {
      ApiResponseHelper.validationError(res, "Store ID is required");
      return;
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

    ApiResponseHelper.success(res, store, "Store verified successfully");
  } catch (error) {
    logger.error("Error updating store", error, { storeId: req.params.id });
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

export async function handleUnverifyStore(
  req: AuthenticatedRequest,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Only admin can unverify stores
    if (user.role !== "admin") {
      ApiResponseHelper.forbidden(res, "Only administrators can unverify stores");
      return;
    }

    if (!id) {
      ApiResponseHelper.validationError(res, "Store ID is required");
      return;
    }

    // Update store verification status
    const store = await storeService.updateStore(id, { isVerified: false });

    // Log the activity
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: "store_unverified",
      message: `Store "${store.name}" has been unverified`,
      storeName: store.name,
      storeId: store.id,
      userId: user.id,
      userName,
      metadata: {
        unverifiedBy: user.id,
        unverifiedAt: new Date().toISOString(),
      },
    });

    ApiResponseHelper.success(res, store, "Store unverified successfully");
  } catch (error) {
    logger.error("Error updating store", error, { storeId: req.params.id });
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

