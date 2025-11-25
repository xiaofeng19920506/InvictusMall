import { Request, Response } from "express";
import { TransactionModel, TransactionFilters } from "../../models/TransactionModel";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetTransactions(
  req: AuthenticatedRequest,
  res: Response,
  transactionModel: TransactionModel
): Promise<void> {
  try {
    const filters: TransactionFilters = {};

    if (req.query.storeId) {
      filters.storeId = req.query.storeId as string;
    }
    if (req.query.transactionType) {
      filters.transactionType = req.query.transactionType as any;
    }
    if (req.query.status) {
      filters.status = req.query.status as any;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string);
    }
    if (req.query.orderId) {
      filters.orderId = req.query.orderId as string;
    }

    // Role-based filtering: owners/managers can only see their store's transactions
    if (req.user && req.user.role !== "admin") {
      // For non-admin users, we need to get their store ID from staff table
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId) {
        filters.storeId = (staff as any).storeId;
      } else {
        // If no store ID, return empty array for non-admin users
        ApiResponseHelper.successWithCount(res, [], 0);
        return;
      }
    }

    const transactions = await transactionModel.getTransactions(filters);

    ApiResponseHelper.successWithCount(res, transactions, transactions.length);
  } catch (error) {
    logger.error("Error fetching transactions", error, { userId: req.user?.id });
    ApiResponseHelper.error(res, "Failed to fetch transactions", 500, error);
  }
}

