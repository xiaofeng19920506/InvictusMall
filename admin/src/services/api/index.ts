// Central export file for all API modules organized by page/feature
export { api, API_BASE_URL } from './client';
export { default } from './client';

// Re-export common types
export type { ApiResponse } from './types';
export type { ActivityLog } from '../../shared/types/store';

// Store management (Stores page)
export { storeApi } from './storeApi';
export type {
  Store,
  Location,
  CreateStoreRequest,
  UpdateStoreRequest,
} from './types';

// Product management (Products/Inventory pages)
export { productApi } from './productApi';
export type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from './productApi';

// Product Review management (Products page)
export { productReviewApi } from './productReviewApi';
export type {
  ProductReview,
  ReviewStats,
} from './productReviewApi';

// Category management (Categories page)
export { categoryApi } from './categoryApi';
export type {
  Category,
  CategoryTree,
} from './categoryApi';

// Order management (Orders page)
export { orderApi } from './orderApi';
export type {
  Order,
  OrderItem,
  OrderStatus,
  UpdateOrderStatusRequest,
} from './orderApi';

// Refund management (Orders page)
export { refundApi } from './refundApi';

// Return management (Orders page)
export { returnApi } from './returnApi';
export type {
  OrderReturn,
  CreateReturnRequest,
  UpdateReturnStatusRequest,
} from './returnApi';

// Transaction management (Transactions page)
export { transactionApi } from './transactionApi';
export type {
  StoreTransaction,
  StripeTransaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionStats,
} from './transactionApi';

// Staff/User management (Users page)
export { staffApi } from './staffApi';
export type {
  Staff,
  UpdateStaffRequest,
} from './staffApi';

// Activity logs (Dashboard/System Logs pages)
export { activityLogApi } from './activityLogApi';

// Health check (Dashboard page)
export { healthApi } from './healthApi';

// Inventory/Stock operations (Inventory page)
export { stockOperationApi } from './stockOperationApi';
export type {
  StockOperation,
  CreateStockOperationRequest,
} from './stockOperationApi';

// Withdrawal management (Withdrawals page)
export { withdrawalApi } from './withdrawalApi';
export type {
  Withdrawal,
  StoreBalance,
  CreateWithdrawalRequest,
} from './withdrawalApi';
