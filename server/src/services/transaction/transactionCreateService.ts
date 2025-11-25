import { Request, Response } from "express";
import { TransactionModel, CreateTransactionRequest } from "../../models/TransactionModel";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleCreateTransaction(
  req: AuthenticatedRequest,
  res: Response,
  transactionModel: TransactionModel
): Promise<void> {
  try {
    // Role-based access control
    if (req.user && req.user.role !== "admin") {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== req.body.storeId) {
        ApiResponseHelper.forbidden(
          res,
          "Insufficient permissions to create transactions for this store"
        );
        return;
      }
    }

    const transactionData: CreateTransactionRequest = {
      ...req.body,
      createdBy: req.user?.id,
      transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : undefined,
    };

    const transaction = await transactionModel.createTransaction(transactionData);

    ApiResponseHelper.success(res, transaction, "Transaction created successfully", 201);
  } catch (error) {
    logger.error("Error creating transaction", error, { userId: req.user?.id });
    ApiResponseHelper.error(res, "Failed to create transaction", 500, error);
  }
}

