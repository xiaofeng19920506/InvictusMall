import { Request, Response } from "express";
import { TransactionModel, UpdateTransactionRequest } from "../../models/TransactionModel";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleUpdateTransaction(
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

    const existingTransaction = await transactionModel.getTransactionById(id);
    if (!existingTransaction) {
      ApiResponseHelper.notFound(res, "Transaction");
      return;
    }

    // Role-based access control
    if (req.user && req.user.role !== "admin") {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== existingTransaction.storeId) {
        ApiResponseHelper.forbidden(res, "Insufficient permissions to update this transaction");
        return;
      }
    }

    const updateData: UpdateTransactionRequest = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;

    const updatedTransaction = await transactionModel.updateTransaction(id, updateData);

    ApiResponseHelper.success(res, updatedTransaction, "Transaction updated successfully");
  } catch (error) {
    logger.error("Error updating transaction", error, {
      transactionId: req.params.id,
      userId: req.user?.id,
    });
    ApiResponseHelper.error(res, "Failed to update transaction", 500, error);
  }
}

