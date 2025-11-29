import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { Product } from '../../types';

// Helper function to get API base URL (same logic as api.ts)
const getApiBaseUrl = (): string => {
  const isDevice = Constants.isDevice;
  const deviceId = Constants.deviceId || '';
  const isSimulator = deviceId.includes('Simulator') || deviceId.includes('Emulator');
  const isLikelySimulator = isSimulator || (isDevice !== undefined && !isDevice);
  
  const deviceApiUrl = Constants.expoConfig?.extra?.deviceApiUrl;
  const simulatorApiUrl = Constants.expoConfig?.extra?.simulatorApiUrl;
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
    return apiUrl;
  }

  if (isLikelySimulator) {
    return simulatorApiUrl || 'http://localhost:3001';
  }

  if (deviceApiUrl) {
    return deviceApiUrl;
  }

  if (apiUrl && !apiUrl.includes('localhost')) {
    return apiUrl;
  }

  return 'http://localhost:3001';
};

const baseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: async (headers) => {
    const token = await AsyncStorage.getItem('staff_auth_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Custom base query with error handling
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    // Unauthorized - clear token
    await AsyncStorage.removeItem('staff_auth_token');
    await AsyncStorage.removeItem('staff_user');
  }
  
  return result;
};

export const warehouseApi = createApi({
  reducerPath: 'warehouseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'StockOperation', 'ProductByBarcode'],
  keepUnusedDataFor: 60, // Cache unused data for 60 seconds
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  endpoints: (builder) => ({
    // Get product by barcode
    getProductByBarcode: builder.query<Product, string>({
      query: (barcode) => ({
        url: `/api/products/barcode/${barcode}`,
        method: 'GET',
      }),
      transformResponse: (response: { success: boolean; data?: Product; message?: string }) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Product not found');
      },
      transformErrorResponse: (response: any) => {
        if (response.status === 404) {
          // Return null-like value that we can check
          return { status: 404, data: null };
        }
        return response;
      },
      providesTags: (result, error, barcode) => {
        const tags: Array<{ type: 'ProductByBarcode' | 'Product'; id: string }> = [
          { type: 'ProductByBarcode' as const, id: barcode },
        ];
        if (result) {
          tags.push({ type: 'Product' as const, id: result.id });
        }
        return tags;
      },
      keepUnusedDataFor: 300, // Cache barcode lookups for 5 minutes (products don't change frequently)
    }),

    // Create product
    createProduct: builder.mutation<
      Product,
      {
        storeId: string;
        name: string;
        description?: string;
        price: number;
        barcode?: string;
        stockQuantity?: number;
        category?: string;
        isActive?: boolean;
        serialNumber?: string;
      }
    >({
      query: (data) => ({
        url: '/api/products',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: Product }) => response.data,
      invalidatesTags: (result, error, arg) => {
        const tags: Array<{ type: 'Product' | 'ProductByBarcode'; id?: string }> = [];
        if (result) {
          tags.push({ type: 'Product' as const, id: result.id });
        }
        if (arg.barcode) {
          tags.push({ type: 'ProductByBarcode' as const, id: arg.barcode });
        }
        // Also invalidate LIST tag to refresh any product lists
        tags.push({ type: 'Product' as const, id: 'LIST' });
        tags.push({ type: 'ProductByBarcode' as const, id: 'LIST' });
        return tags;
      },
    }),

    // Extract text from image (OCR)
    extractTextFromImage: builder.mutation<
      {
        text: string;
        confidence: number;
        lines?: string[];
        words?: string[];
        parsed: {
          name?: string;
          serialNumber?: string;
          barcode?: string;
          price?: number;
          otherInfo?: string[];
        };
      },
      { imageUri: string }
    >({
      query: ({ imageUri }) => {
        const filename = imageUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);

        return {
          url: '/api/ocr/extract',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      transformResponse: (response: {
        success: boolean;
        data: {
          text: string;
          confidence: number;
          lines?: string[];
          words?: string[];
          parsed: any;
        };
      }) => response.data,
    }),

    // Create stock operation
    createStockOperation: builder.mutation<
      {
        operation: any;
        orderUpdated?: boolean;
        orderStatus?: string;
      },
      {
        productId: string;
        type: 'in' | 'out';
        quantity: number;
        reason?: string;
        orderId?: string;
      }
    >({
      query: (data) => ({
        url: '/api/stock-operations',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: {
          operation: any;
          orderUpdated?: boolean;
          orderStatus?: string;
        };
      }) => response.data,
      invalidatesTags: (result, error, arg) => [
        { type: 'Product' as const, id: arg.productId }, // Invalidate specific product
        { type: 'Product' as const, id: 'LIST' }, // Invalidate product lists
        { type: 'ProductByBarcode' as const, id: 'LIST' }, // Invalidate all barcode caches
        { type: 'StockOperation' as const },
      ],
    }),

    // Batch stock operations
    batchStockIn: builder.mutation<
      Array<{ operation: any }>,
      Array<{
        productId: string;
        quantity: number;
        reason?: string;
      }>
    >({
      queryFn: async (items, _api, _extraOptions, baseQuery) => {
        try {
          console.log('[warehouseApi] Starting batch stock in with items:', items);
          
          const operations = await Promise.all(
            items.map(async (item, index) => {
              console.log(`[warehouseApi] Processing item ${index + 1}/${items.length}:`, {
                productId: item.productId,
                quantity: item.quantity,
                reason: item.reason,
              });
              
              const result = await baseQuery({
                url: '/api/stock-operations',
                method: 'POST',
                body: {
                  productId: item.productId,
                  type: 'in' as const,
                  quantity: item.quantity,
                  reason: item.reason,
                },
              });
              
              console.log(`[warehouseApi] Item ${index + 1} result:`, {
                success: result.data?.success,
                error: result.error,
                data: result.data?.data || result.data,
              });
              
              return result;
            })
          );

          const failed = operations.filter((op: any) => {
            const hasError = op.error !== undefined;
            const noSuccess = !op.data?.success;
            return hasError || noSuccess;
          });
          
          if (failed.length > 0) {
            console.error('[warehouseApi] Failed operations:', failed);
            const errorMessages = failed.map((op: any, index: number) => {
              const item = items[index];
              const errorMsg = op.error?.data?.message || op.error?.error || op.data?.message || 'Unknown error';
              return `Product ${item.productId}: ${errorMsg}`;
            });
            const errorMessage = `${failed.length} of ${items.length} operations failed:\n${errorMessages.join('\n')}`;
            
            return { 
              error: { 
                status: 'CUSTOM_ERROR' as const, 
                data: errorMessage,
                error: errorMessage
              } as FetchBaseQueryError
            };
          }

          const results = operations.map((op: any) => {
            const data = op.data?.data || op.data;
            console.log('[warehouseApi] Operation result:', data);
            return data;
          });
          
          console.log('[warehouseApi] Batch stock in completed successfully:', results);
          return { data: results };
        } catch (error: any) {
          console.error('[warehouseApi] Batch stock in error:', error);
          const errorMessage = error.message || 'Batch stock in failed';
          return { 
            error: { 
              status: 'CUSTOM_ERROR' as const, 
              data: errorMessage,
              error: errorMessage
            } as FetchBaseQueryError
          };
        }
      },
      invalidatesTags: (result, error, items) => {
        const tags: Array<{ type: 'Product' | 'ProductByBarcode' | 'StockOperation'; id?: string }> = [
          { type: 'Product' as const, id: 'LIST' },
          { type: 'ProductByBarcode' as const, id: 'LIST' },
          { type: 'StockOperation' as const },
        ];
        // Invalidate cache for each affected product
        items.forEach((item) => {
          tags.push({ type: 'Product' as const, id: item.productId });
        });
        return tags;
      },
    }),
  }),
});

export const {
  useGetProductByBarcodeQuery,
  useLazyGetProductByBarcodeQuery,
  useCreateProductMutation,
  useExtractTextFromImageMutation,
  useCreateStockOperationMutation,
  useBatchStockInMutation,
} = warehouseApi;

