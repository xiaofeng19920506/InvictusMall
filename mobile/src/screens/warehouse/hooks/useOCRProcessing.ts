import { useState } from 'react';
import apiService from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import type { Product } from '../../../types';

interface UseOCRProcessingOptions {
  onProductFound?: (product: Product, serialNumber?: string) => void;
  onProductNotFound?: (barcode: string, name: string, price?: number, serialNumber?: string) => void;
  operationType?: 'in' | 'out' | null;
}

export const useOCRProcessing = (options?: UseOCRProcessingOptions) => {
  const { showSuccess, showError } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);

    try {
      console.log('[useOCRProcessing] 📷 Photo taken, starting OCR...');

      const ocrResponse = await apiService.extractTextFromImage(imageUri);

      if (!ocrResponse.success || !ocrResponse.data) {
        showError('Failed to extract text from image');
        return;
      }

      const { text, parsed } = ocrResponse.data;
      console.log('[useOCRProcessing] 📝 OCR result:', {
        text: text.substring(0, 100),
        parsed,
      });

      // Try to find product by barcode first
      let product: Product | null = null;

      if (parsed.barcode) {
        console.log('[useOCRProcessing] 🔍 Searching product by barcode:', parsed.barcode);
        try {
          const barcodeResponse = await apiService.getProductByBarcode(parsed.barcode);
          if (barcodeResponse.success && barcodeResponse.data) {
            product = barcodeResponse.data;
            console.log('[useOCRProcessing] ✅ Product found by barcode:', product.name);
          }
        } catch (error) {
          console.log('[useOCRProcessing] ⚠️ Product not found by barcode');
        }
      }

      // Extract product name from OCR text if not found
      let productName = parsed.name;
      if (!productName || productName.length < 3) {
        const textLines = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        productName =
          textLines.find(
            (line) =>
              line.length >= 3 &&
              /[a-zA-Z\u4e00-\u9fa5]/.test(line) &&
              !/^(S\/N|SN|S\/N:|SN:)/i.test(line) &&
              !/^(LR|MNK|Part|Model|Code|SKU|MNK:)/i.test(line)
          ) ||
          textLines[0] ||
          text.substring(0, 100);
      }

      if (product) {
        // Product found
        const serialNumber = parsed.serialNumber || undefined;
        if (options?.onProductFound) {
          options.onProductFound(product, serialNumber);
        }
      } else {
        // Product not found
        if (options?.onProductNotFound) {
          options.onProductNotFound(
            parsed.barcode || '',
            productName ? productName.trim() : '',
            parsed.price,
            parsed.serialNumber
          );
        }
      }
    } catch (error: any) {
      console.error('[useOCRProcessing] ❌ OCR processing error:', error);
      showError(error.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processImage,
  };
};

