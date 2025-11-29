import type { StockStatus } from './types';

export const getStockStatus = (stock: number): StockStatus => {
  if (stock === 0) {
    return { text: "Out of Stock", color: "#FF3B30" };
  } else if (stock <= 10) {
    return { text: "Low Stock", color: "#FF9500" };
  } else {
    return { text: "In Stock", color: "#34C759" };
  }
};

