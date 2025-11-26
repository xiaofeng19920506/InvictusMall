import apiService from '../services/api';
import type {BarcodeScanResult, Product, Order} from '../types';

/**
 * Analyze barcode and determine its type and fetch related data
 */
export async function analyzeBarcode(
  barcode: string,
): Promise<BarcodeScanResult | null> {
  if (!barcode || barcode.trim().length === 0) {
    return null;
  }

  const trimmedBarcode = barcode.trim();

  // Try to identify barcode type and fetch data
  try {
    // Try as product barcode first
    try {
      const productResponse = await apiService.getProductByBarcode(trimmedBarcode);
      if (productResponse.success && productResponse.data) {
        return {
          type: 'product',
          value: trimmedBarcode,
          data: productResponse.data,
        };
      }
    } catch (error) {
      // Product not found, continue checking
    }

    // Try as order ID (UUID format or order number)
    if (trimmedBarcode.length >= 8) {
      try {
        const orderResponse = await apiService.getOrderByBarcode(trimmedBarcode);
        if (orderResponse.success && orderResponse.data) {
          return {
            type: 'order',
            value: trimmedBarcode,
            data: orderResponse.data,
          };
        }
      } catch (error) {
        // Order not found, continue checking
      }
    }

    // Try as tracking number
    // Tracking numbers are usually alphanumeric and longer
    if (trimmedBarcode.length > 8) {
      try {
        const shipmentsResponse = await apiService.getAllShipments({
          limit: 1,
          offset: 0,
        });
        if (shipmentsResponse.success && shipmentsResponse.data) {
          const shipment = shipmentsResponse.data.shipments.find(
            (s) => s.trackingNumber === trimmedBarcode,
          );
          if (shipment) {
            return {
              type: 'tracking',
              value: trimmedBarcode,
              data: shipment,
            };
          }
        }
      } catch (error) {
        // Tracking not found
      }
    }

    // Unknown barcode type
    return {
      type: 'unknown',
      value: trimmedBarcode,
    };
  } catch (error) {
    console.error('Error analyzing barcode:', error);
    return {
      type: 'unknown',
      value: trimmedBarcode,
    };
  }
}

/**
 * Validate barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode || barcode.trim().length === 0) {
    return false;
  }

  // Basic validation - alphanumeric and common symbols
  const barcodeRegex = /^[A-Za-z0-9\-_]+$/;
  return barcodeRegex.test(barcode.trim());
}

/**
 * Format barcode for display
 */
export function formatBarcode(barcode: string): string {
  return barcode.trim().toUpperCase();
}

