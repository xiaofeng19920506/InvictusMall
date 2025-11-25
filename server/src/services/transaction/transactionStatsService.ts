import { Request, Response } from "express";
import { TransactionModel } from "../../models/TransactionModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetStoreStats(
  req: AuthenticatedRequest,
  res: Response,
  transactionModel: TransactionModel
): Promise<void> {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      ApiResponseHelper.validationError(res, "Store ID is required");
      return;
    }

    // Role-based access control
    if (req.user && req.user.role !== "admin") {
      const { StaffModel } = await import("../../models/StaffModel");
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== storeId) {
        ApiResponseHelper.forbidden(
          res,
          "Insufficient permissions to view this store's statistics"
        );
        return;
      }
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const stats = await transactionModel.getStoreTransactionStats(storeId, startDate, endDate);

    ApiResponseHelper.success(res, stats);
  } catch (error) {
    logger.error("Error fetching store statistics", error, {
      storeId: req.params.storeId,
      userId: req.user?.id,
    });
    ApiResponseHelper.error(res, "Failed to fetch store statistics", 500, error);
  }
}

