import apiService from '../services/api';
import type {BarcodeScanResult, Product, Order} from '../types';

/**
 * Analyze barcode and determine its type and fetch related data
 */
export async function analyzeBarcode(
  barcode: string,
): Promise<BarcodeScanResult | null> {
  console.log('[analyzeBarcode] 🔍 Starting barcode analysis:', barcode);
  
  if (!barcode || barcode.trim().length === 0) {
    console.warn('[analyzeBarcode] ⚠️ Empty or invalid barcode provided');
    return null;
  }

  const trimmedBarcode = barcode.trim();
  console.log('[analyzeBarcode] 📝 Trimmed barcode:', trimmedBarcode, `(length: ${trimmedBarcode.length})`);

  // Try to identify barcode type and fetch data
  try {
    // Try as product barcode first
    console.log('[analyzeBarcode] 🛍️ Attempting to find product by barcode...');
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timeout')), 10000); // 10 second timeout
      });

      const productResponse = await Promise.race([
        apiService.getProductByBarcode(trimmedBarcode),
        timeoutPromise,
      ]) as any;

      console.log('[analyzeBarcode] 📦 Product API response:', {
        success: productResponse?.success,
        hasData: !!productResponse?.data,
        productId: productResponse?.data?.id,
        productName: productResponse?.data?.name,
      });
      
      if (productResponse?.success && productResponse?.data) {
        console.log('[analyzeBarcode] ✅ Product found:', productResponse.data.name);
        return {
          type: 'product',
          value: trimmedBarcode,
          data: productResponse.data,
        };
      } else {
        console.log('[analyzeBarcode] ❌ Product not found or invalid response');
      }
    } catch (error: any) {
      console.error('[analyzeBarcode] ❌ Error fetching product:', error);
      console.error('[analyzeBarcode] Error details:', {
        message: error?.message || String(error),
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        code: error?.code,
      });

      // If it's a 404, product doesn't exist in our database
      // Try external barcode lookup services before returning product_not_found
      if (error?.response?.status === 404) {
        console.log('[analyzeBarcode] 📝 Product not found in database, trying external barcode lookup...');
        
        try {
          // Try external barcode lookup services
          const externalLookupResponse = await apiService.lookupBarcodeFromExternal(trimmedBarcode);
          
          if (externalLookupResponse.success && externalLookupResponse.data) {
            console.log('[analyzeBarcode] ✅ Product found in external database:', {
              source: externalLookupResponse.data.source,
              productName: externalLookupResponse.data.name,
            });
            
            // Return product_not_found but with external product info for pre-filling form
            return {
              type: 'product_not_found',
              value: trimmedBarcode,
              message: `Product with barcode "${trimmedBarcode}" not found in your database, but found in ${externalLookupResponse.data.source}. You can create a new product with pre-filled information.`,
              externalProductInfo: {
                name: externalLookupResponse.data.name,
                description: externalLookupResponse.data.description,
                brand: externalLookupResponse.data.brand,
                category: externalLookupResponse.data.category,
                imageUrl: externalLookupResponse.data.imageUrl,
                price: externalLookupResponse.data.price,
                source: externalLookupResponse.data.source,
                additionalInfo: externalLookupResponse.data.additionalInfo,
              },
            };
          } else {
            console.log('[analyzeBarcode] ❌ Product not found in external databases either');
          }
        } catch (externalError: any) {
          console.warn('[analyzeBarcode] ⚠️ External barcode lookup failed:', externalError.message);
          // Continue to return product_not_found without external info
        }
        
        // Return product_not_found (will use OCR as fallback if needed)
        console.log('[analyzeBarcode] 📝 Returning product_not_found type for creation (no external data found)');
        return {
          type: 'product_not_found',
          value: trimmedBarcode,
          message: `Product with barcode "${trimmedBarcode}" does not exist. You can create a new product.`,
        };
      }

      // For other errors, continue checking other types
      console.log('[analyzeBarcode] 🔄 Product lookup failed, continuing to check other types');
    }

    // Try as order ID (UUID format or order number)
    if (trimmedBarcode.length >= 8) {
      console.log('[analyzeBarcode] 📦 Attempting to find order by ID...');
      try {
        const orderResponse = await apiService.getOrderByBarcode(trimmedBarcode);
        console.log('[analyzeBarcode] 📋 Order API response:', {
          success: orderResponse.success,
          hasData: !!orderResponse.data,
          orderId: orderResponse.data?.id,
        });
        
        if (orderResponse.success && orderResponse.data) {
          console.log('[analyzeBarcode] ✅ Order found:', orderResponse.data.id);
          return {
            type: 'order',
            value: trimmedBarcode,
            data: orderResponse.data,
          };
        } else {
          console.log('[analyzeBarcode] ❌ Order not found or invalid response');
        }
      } catch (error) {
        console.error('[analyzeBarcode] ❌ Error fetching order:', error);
        console.error('[analyzeBarcode] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          response: (error as any)?.response?.data,
        });
        // Order not found, continue checking
      }
    } else {
      console.log('[analyzeBarcode] ⏭️ Skipping order check - barcode too short');
    }

    // Try as tracking number
    // Tracking numbers are usually alphanumeric and longer
    if (trimmedBarcode.length > 8) {
      console.log('[analyzeBarcode] 🚚 Attempting to find shipment by tracking number...');
      try {
        const shipmentsResponse = await apiService.getAllShipments({
          limit: 1,
          offset: 0,
        });
        console.log('[analyzeBarcode] 📦 Shipments API response:', {
          success: shipmentsResponse.success,
          hasData: !!shipmentsResponse.data,
          shipmentCount: shipmentsResponse.data?.shipments?.length,
        });
        
        if (shipmentsResponse.success && shipmentsResponse.data) {
          const shipment = shipmentsResponse.data.shipments.find(
            (s) => s.trackingNumber === trimmedBarcode,
          );
          if (shipment) {
            console.log('[analyzeBarcode] ✅ Shipment found:', shipment.id);
            return {
              type: 'tracking',
              value: trimmedBarcode,
              data: shipment,
            };
          } else {
            console.log('[analyzeBarcode] ❌ No shipment found with matching tracking number');
          }
        } else {
          console.log('[analyzeBarcode] ❌ Shipments API response invalid');
        }
      } catch (error) {
        console.error('[analyzeBarcode] ❌ Error fetching shipments:', error);
        console.error('[analyzeBarcode] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          response: (error as any)?.response?.data,
        });
        // Tracking not found
      }
    } else {
      console.log('[analyzeBarcode] ⏭️ Skipping tracking check - barcode too short');
    }

    // Unknown barcode type
    console.log('[analyzeBarcode] ❓ Barcode type unknown, returning unknown result');
    return {
      type: 'unknown',
      value: trimmedBarcode,
    };
  } catch (error) {
    console.error('[analyzeBarcode] ❌ Fatal error analyzing barcode:', error);
    console.error('[analyzeBarcode] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

