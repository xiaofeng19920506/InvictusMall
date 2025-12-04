import { logger } from '../utils/logger';

export interface BarcodeLookupResult {
  success: boolean;
  source: 'upcdatabase' | 'openfoodfacts' | 'amazon' | 'ocr' | null;
  product?: {
    name: string;
    description?: string;
    barcode: string;
    brand?: string;
    category?: string;
    imageUrl?: string;
    price?: number;
    additionalInfo?: Record<string, any>;
  };
  error?: string;
}

export class BarcodeLookupService {
  private upcdatabaseApiKey: string | null;

  constructor() {
    // UPC Database API key (from https://upcdatabase.org/)
    // Register at https://upcdatabase.org/ to get your API key
    this.upcdatabaseApiKey = process.env.UPCDATABASE_API_KEY || null;
  }

  /**
   * Main lookup method - tries all sources in order
   */
  async lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
    logger.info('[BarcodeLookupService] Starting barcode lookup', { barcode });

    // Step 1: Try UPC Database first (https://upcdatabase.org/)
    logger.debug('[BarcodeLookupService] Trying UPC Database...');
    try {
      const upcDbResult = await this.lookupUPCDatabase(barcode);
      if (upcDbResult.success && upcDbResult.product) {
        logger.info('[BarcodeLookupService] Product found via UPC Database', {
          barcode,
          productName: upcDbResult.product.name,
        });
        return upcDbResult;
      }
    } catch (error: any) {
      logger.warn('[BarcodeLookupService] UPC Database lookup failed', {
        barcode,
        error: error.message,
      });
    }

    // Step 2: Try Open Food Facts / Beauty Facts (food/cosmetics only)
    logger.debug('[BarcodeLookupService] Trying Open Food Facts...');
    try {
      const offResult = await this.lookupOpenFoodFacts(barcode);
      if (offResult.success && offResult.product) {
        logger.info('[BarcodeLookupService] Product found via Open Food Facts', {
          barcode,
          productName: offResult.product.name,
        });
        return offResult;
      }
    } catch (error: any) {
      logger.warn('[BarcodeLookupService] Open Food Facts lookup failed', {
        barcode,
        error: error.message,
      });
    }

    // Step 3: Try Amazon ASIN lookup (if barcode might be ASIN)
    logger.debug('[BarcodeLookupService] Trying Amazon ASIN lookup...');
    try {
      const amazonResult = await this.lookupAmazonASIN(barcode);
      if (amazonResult.success && amazonResult.product) {
        logger.info('[BarcodeLookupService] Product found via Amazon', {
          barcode,
          productName: amazonResult.product.name,
        });
        return amazonResult;
      }
    } catch (error: any) {
      logger.warn('[BarcodeLookupService] Amazon lookup failed', {
        barcode,
        error: error.message,
      });
    }

    // All sources failed
    logger.warn('[BarcodeLookupService] Product not found in any external source', {
      barcode,
    });

    return {
      success: false,
      source: null,
      error: 'Product not found in any external database',
    };
  }

  /**
   * Lookup product in UPC Database (https://upcdatabase.org/)
   * Requires API key - register at https://upcdatabase.org/ to get API key
   * API endpoint: https://api.upcdatabase.org/product/{UPC}?apikey={API_KEY}
   */
  private async lookupUPCDatabase(barcode: string): Promise<BarcodeLookupResult> {
    if (!this.upcdatabaseApiKey) {
      logger.debug('[BarcodeLookupService] UPC Database API key not configured');
      return {
        success: false,
        source: 'upcdatabase',
        error: 'UPC Database API key not configured. Please set UPCDATABASE_API_KEY in environment variables.',
      };
    }

    try {
      const url = `https://api.upcdatabase.org/product/${barcode}?apikey=${this.upcdatabaseApiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid UPC Database API key');
        }
        throw new Error(`UPC Database API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      // UPC Database API response format
      // Check for successful response - may vary based on API version
      if (data.success === true || (data.title && data.title !== 'Product Not Found')) {
        return {
          success: true,
          source: 'upcdatabase',
          product: {
            name: data.title || data.name || 'Unknown Product',
            description: data.description,
            barcode: barcode,
            brand: data.brand || data.manufacturer,
            category: data.category,
            imageUrl: data.image || data.image_url,
            price: data.price ? parseFloat(String(data.price)) : undefined,
            additionalInfo: {
              alias: data.alias,
              color: data.color,
              size: data.size,
              model: data.model,
              weight: data.weight,
              dimension: data.dimension,
              manufacturer: data.manufacturer,
            },
          },
        };
      }

      return {
        success: false,
        source: 'upcdatabase',
        error: data.message || 'Product not found in UPC Database',
      };
    } catch (error: any) {
      logger.error('[BarcodeLookupService] UPC Database lookup error', {
        barcode,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Lookup product in Open Food Facts / Beauty Facts
   * Food products and cosmetics
   */
  private async lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult> {
    try {
      // Open Food Facts API
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;

        // Determine product type (food or cosmetics)
        const productType = product.categories_tags?.find((tag: string) => 
          tag.includes('beauty') || tag.includes('cosmetics')
        ) ? 'cosmetics' : 'food';

        return {
          success: true,
          source: 'openfoodfacts',
          product: {
            name: product.product_name || product.product_name_en || product.abbreviated_product_name || 'Unknown Product',
            description: product.generic_name || product.product_name,
            barcode: barcode,
            brand: product.brands || product.brand,
            category: product.categories || product.categories_tags?.join(', '),
            imageUrl: product.image_url || product.image_front_url || product.image_small_url,
            additionalInfo: {
              productType,
              quantity: product.quantity,
              packaging: product.packaging,
              ingredients: product.ingredients_text,
              nutrition: product.nutriments,
              allergens: product.allergens,
              labels: product.labels_tags,
              countries: product.countries_tags,
            },
          },
        };
      }

      return {
        success: false,
        source: 'openfoodfacts',
        error: 'Product not found in Open Food Facts',
      };
    } catch (error: any) {
      logger.error('[BarcodeLookupService] Open Food Facts lookup error', {
        barcode,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Lookup product via Amazon ASIN
   * Note: Amazon doesn't have a public API, so this is a basic web scrape simulation
   * For production, consider using Amazon Product Advertising API
   */
  private async lookupAmazonASIN(barcode: string): Promise<BarcodeLookupResult> {
    try {
      // Check if barcode might be an ASIN (Amazon ASINs are typically 10 characters)
      if (barcode.length !== 10) {
        return {
          success: false,
          source: 'amazon',
          error: 'Barcode length does not match Amazon ASIN format',
        };
      }

      // Amazon Product Advertising API would be used here
      // For now, return not found since we don't have API access
      // In production, you would:
      // 1. Use Amazon Product Advertising API (requires approval)
      // 2. Or use a third-party service that provides Amazon product data

      logger.debug('[BarcodeLookupService] Amazon ASIN lookup not implemented (requires API access)', {
        barcode,
      });

      return {
        success: false,
        source: 'amazon',
        error: 'Amazon lookup not available (API access required)',
      };
    } catch (error: any) {
      logger.error('[BarcodeLookupService] Amazon lookup error', {
        barcode,
        error: error.message,
      });
      throw error;
    }
  }
}
