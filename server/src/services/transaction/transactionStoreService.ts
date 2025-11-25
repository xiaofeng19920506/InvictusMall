import { Request, Response } from "express";
import { TransactionModel } from "../../models/TransactionModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetStoreTransactions(
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

    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await transactionModel.getTransactionsByStoreId(storeId, limit);

    ApiResponseHelper.successWithCount(res, transactions, transactions.length);
  } catch (error) {
    logger.error("Error fetching store transactions", error, {
      storeId: req.params.storeId,
      userId: req.user?.id,
    });
    ApiResponseHelper.error(res, "Failed to fetch store transactions", 500, error);
  }
}

