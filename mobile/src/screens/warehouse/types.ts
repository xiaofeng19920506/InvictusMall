import type { Product } from '../../types';

export type TabType = "operations" | "inventory";

export interface PendingStockInItem {
  id: string; // Unique ID for this scan
  product: Product;
  serialNumber?: string;
  scannedAt: Date;
}

export interface StockStatus {
  text: string;
  color: string;
}

