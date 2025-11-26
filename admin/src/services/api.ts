// ============================================
// API MODULE - Central Export Point
// ============================================
// All APIs have been refactored into separate modules in ./api/ directory
// This file acts as a compatibility layer, re-exporting all APIs from the modular structure
//
// Organized by page/feature:
//   - storeApi.ts - Stores page
//   - productApi.ts - Products/Inventory pages
//   - categoryApi.ts - Categories page
//   - orderApi.ts - Orders page
//   - refundApi.ts - Orders page
//   - returnApi.ts - Orders page
//   - transactionApi.ts - Transactions page
//   - staffApi.ts - Users page
//   - activityLogApi.ts - Dashboard/System Logs pages
//   - healthApi.ts - Dashboard page
//   - stockOperationApi.ts - Inventory page
//
// You can import from this file (backward compatible):
//   import { productApi, Order } from './services/api';
//
// Or directly from modules (recommended):
//   import { productApi } from './services/api/productApi';
// ============================================

// Re-export everything from the modular API structure
export * from "./api/index";

// Re-export axios instance as default for backward compatibility
export { default } from "./api/client";
