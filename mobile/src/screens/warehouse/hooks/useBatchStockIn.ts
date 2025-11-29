import { useState } from 'react';
import apiService from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import type { PendingStockInItem } from '../types';

export const useBatchStockIn = () => {
  const { showSuccess, showError } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<PendingStockInItem[]>([]);

  const addItem = (product: any, serialNumber?: string) => {
    const newItem: PendingStockInItem = {
      id: `${product.id}-${Date.now()}-${Math.random()}`,
      product: product,
      serialNumber: serialNumber || undefined,
      scannedAt: new Date(),
    };
    
    setItems((prev) => {
      const updated = [...prev, newItem];
      showSuccess(
        `${product.name} added (${updated.length} item${updated.length > 1 ? 's' : ''} in list)`
      );
      return updated;
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateSerialNumber = (itemId: string, serialNumber: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, serialNumber } : item
      )
    );
  };

  const clearItems = () => {
    setItems([]);
  };

  const stockInAll = async (onComplete?: () => void) => {
    if (items.length === 0) {
      showError('No items to stock in');
      return;
    }

    setIsProcessing(true);
    try {
      const operations = items.map((item) => {
        const reason = item.serialNumber ? `S/N: ${item.serialNumber}` : '';
        return apiService.createStockOperation({
          productId: item.product.id,
          type: 'in',
          quantity: 1,
          reason: reason || undefined,
        });
      });

      const results = await Promise.all(operations);
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        showSuccess(`Successfully stocked in ${items.length} items`);
        clearItems();
        if (onComplete) {
          onComplete();
        }
      } else {
        showError(`${failed.length} operations failed. Please try again.`);
      }
    } catch (error: any) {
      showError(error.message || 'Batch stock in failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    items,
    isProcessing,
    addItem,
    removeItem,
    updateSerialNumber,
    clearItems,
    stockInAll,
  };
};

