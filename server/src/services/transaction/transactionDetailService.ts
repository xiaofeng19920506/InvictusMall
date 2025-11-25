import { Request, Response } from "express";
import { TransactionModel } from "../../models/TransactionModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetTransactionById(
  req: AuthenticatedRequest,
  res: Response,
  transactionModel: TransactionModel
): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      ApiResponseHelper.validationError(res, "Transaction ID is required");
      return;
    }

    const transaction = await transactionModel.getTransactionById(id);

    if (!transaction) {
      ApiResponseHelper.notFound(res, "Transaction");
      return;
    }

    // Role-based access control
    if (req.user && req.user.role !== "admin") {
      const { StaffModel } = await import("../../models/StaffModel");
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== transaction.storeId) {
        ApiResponseHelper.forbidden(res, "Insufficient permissions to view this transaction");
        return;
      }
    }

    ApiResponseHelper.success(res, transaction);
  } catch (error) {
    logger.error("Error fetching transaction", error, {
      transactionId: req.params.id,
      userId: req.user?.id,
    });
    ApiResponseHelper.error(res, "Failed to fetch transaction", 500, error);
  }
}

