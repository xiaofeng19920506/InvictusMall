import { logger } from '../utils/logger';

export interface BarcodeLookupResult {
  success: boolean;
  source: 'upcitemdb' | 'openfoodfacts' | 'google' | 'amazon' | 'ocr' | null;
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
  private upcitemdbApiKey: string | null;
  private googleApiKey: string | null;
  private googleSearchEngineId: string | null;

  constructor() {
    // UPCItemDB is free, no API key needed for basic usage
    // But they offer 100 free calls/day without key, unlimited with key
    this.upcitemdbApiKey = process.env.UPCITEMDB_API_KEY || null;
    
    // Optional: Google Custom Search API (requires API key and Search Engine ID)
    this.googleApiKey = process.env.GOOGLE_API_KEY || null;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || null;
  }

  /**
   * Main lookup method - tries all sources in order
   */
  async lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
    logger.info('[BarcodeLookupService] Starting barcode lookup', { barcode });

    // Step 1: Try UPCItemDB first (best general coverage, 100 free calls/day)
    logger.debug('[BarcodeLookupService] Trying UPCItemDB...');
    try {
      const upcResult = await this.lookupUPCItemDB(barcode);
      if (upcResult.success && upcResult.product) {
        logger.info('[BarcodeLookupService] Product found via UPCItemDB', {
          barcode,
          productName: upcResult.product.name,
        });
        return upcResult;
      }
    } catch (error: any) {
      logger.warn('[BarcodeLookupService] UPCItemDB lookup failed', {
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

    // Step 3: Try Google Search API (if configured)
    if (this.googleApiKey && this.googleSearchEngineId) {
      logger.debug('[BarcodeLookupService] Trying Google Search API...');
      try {
        const googleResult = await this.lookupGoogleSearch(barcode);
        if (googleResult.success && googleResult.product) {
          logger.info('[BarcodeLookupService] Product found via Google Search', {
            barcode,
            productName: googleResult.product.name,
          });
          return googleResult;
        }
      } catch (error: any) {
        logger.warn('[BarcodeLookupService] Google Search lookup failed', {
          barcode,
          error: error.message,
        });
      }
    } else {
      logger.debug('[BarcodeLookupService] Google Search API not configured, skipping');
    }

    // Step 4: Try Amazon ASIN lookup (if barcode might be ASIN)
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
   * Lookup product in UPCItemDB
   * Free: 100 calls/day without API key
   * Unlimited with API key
   */
  private async lookupUPCItemDB(barcode: string): Promise<BarcodeLookupResult> {
    try {
      // UPCItemDB API - use trial endpoint
      // Without API key: 100 free calls/day
      // With API key: Add &key= parameter for unlimited calls
      const apiKey = this.upcitemdbApiKey;
      const url = apiKey
        ? `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}&key=${apiKey}`
        : `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`UPCItemDB API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.code === 'OK' && data.items && data.items.length > 0) {
        const item = data.items[0];
        
        return {
          success: true,
          source: 'upcitemdb',
          product: {
            name: item.title || item.description || 'Unknown Product',
            description: item.description || item.title,
            barcode: barcode,
            brand: item.brand || item.manufacturer,
            category: item.category,
            imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
            additionalInfo: {
              upc: item.upc,
              ean: item.ean,
              model: item.model,
              color: item.color,
              size: item.size,
              dimension: item.dimension,
              weight: item.weight,
            },
          },
        };
      }

      return {
        success: false,
        source: 'upcitemdb',
        error: data.message || 'Product not found in UPCItemDB',
      };
    } catch (error: any) {
      logger.error('[BarcodeLookupService] UPCItemDB lookup error', {
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
   * Lookup product via Google Custom Search API
   * Requires API key and Search Engine ID
   */
  private async lookupGoogleSearch(barcode: string): Promise<BarcodeLookupResult> {
    if (!this.googleApiKey || !this.googleSearchEngineId) {
      throw new Error('Google API key and Search Engine ID are required');
    }

    try {
      const searchQuery = `barcode ${barcode} product`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        
        // Extract product name from title (usually format: "Product Name - Brand")
        const titleParts = item.title.split(' - ');
        const productName = titleParts[0] || item.title;

        return {
          success: true,
          source: 'google',
          product: {
            name: productName,
            description: item.snippet,
            barcode: barcode,
            imageUrl: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.metatags?.[0]?.['og:image'],
            additionalInfo: {
              link: item.link,
              displayLink: item.displayLink,
              snippet: item.snippet,
            },
          },
        };
      }

      return {
        success: false,
        source: 'google',
        error: 'Product not found via Google Search',
      };
    } catch (error: any) {
      logger.error('[BarcodeLookupService] Google Search lookup error', {
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

