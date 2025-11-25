import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleDeleteStore(
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

    // Get store info before deleting for logging
    const storeToDelete = await storeService.getStoreById(id);

    await storeService.deleteStore(id);

    // Log the activity
    const userId = getUserIdFromRequest(req as AuthenticatedRequest);
    const userName = await getUserNameFromRequest(req as AuthenticatedRequest);
    await ActivityLogModel.createLog({
      type: "store_deleted",
      message: `Store "${storeToDelete.name}" has been deleted`,
      storeName: storeToDelete.name,
      storeId: storeToDelete.id,
      userId,
      userName,
      metadata: {
        deletedAt: new Date().toISOString(),
        categories: storeToDelete.category,
        rating: storeToDelete.rating,
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting store", error, { storeId: req.params.id });
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

