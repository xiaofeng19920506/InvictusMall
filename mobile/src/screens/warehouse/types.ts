import type { Product } from '../../types';

export type TabType = "operations" | "inventory";

export interface PendingStockInItem {
  id: string; // Unique ID for this item (based on product ID)
  product: Product;
  quantity: number; // Number of units for this product
  serialNumbers?: string[]; // Array of serial numbers (if multiple)
  firstScannedAt: string; // ISO string: When this product was first scanned
  lastScannedAt: string; // ISO string: When this product was last scanned
}

export interface StockStatus {
  text: string;
  color: string;
}

