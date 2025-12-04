import { baseApi } from "./baseApi";
import type { ApiResponse } from "../../services/api/types";
import type { Product } from "../../services/api/productApi";
import type { Store } from "../../shared/types/store";
import type {
  StockOperation,
  CreateStockOperationRequest,
} from "../../services/api/stockOperationApi";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Stores
    getAllStores: builder.query<Store[], void>({
      query: () => "/api/stores",
      transformResponse: (response: ApiResponse<Store[]>) => response.data,
      providesTags: ["Stores"],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Products
    getProductsByStore: builder.query<
      { products: Product[]; total: number },
      { storeId: string; isActive?: boolean; limit?: number; offset?: number }
    >({
      query: ({ storeId, isActive, limit, offset }) => {
        const params = new URLSearchParams();
        if (isActive !== undefined) params.append("isActive", String(isActive));
        if (limit !== undefined) params.append("limit", String(limit));
        if (offset !== undefined) params.append("offset", String(offset));
        return `/api/products/store/${storeId}?${params.toString()}`;
      },
      transformResponse: (response: ApiResponse<Product[]>) => {
        const products = response.data;
        const total = (response as any).total || products.length;
        return { products, total };
      },
      providesTags: (_result, _error, arg) => [
        { type: "Products", id: arg.storeId },
        "Products",
      ],
      keepUnusedDataFor: 60, // Cache for 1 minute
    }),

    updateProductStock: builder.mutation<
      Product,
      { productId: string; stockQuantity: number }
    >({
      query: ({ productId, ...data }) => ({
        url: `/api/products/${productId}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: ApiResponse<Product>) => response.data,
      invalidatesTags: (result) => [
        "Products",
        { type: "Products", id: result?.storeId },
        "StockOperations",
      ],
    }),

    // Stock Operations
    getStockOperations: builder.query<
      { operations: StockOperation[]; total: number },
      {
        productId?: string;
        type?: "in" | "out";
        limit?: number;
        offset?: number;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.productId)
          searchParams.append("productId", params.productId);
        if (params.type) searchParams.append("type", params.type);
        if (params.limit !== undefined)
          searchParams.append("limit", String(params.limit));
        if (params.offset !== undefined)
          searchParams.append("offset", String(params.offset));
        return `/api/stock-operations?${searchParams.toString()}`;
      },
      transformResponse: (
        response: ApiResponse<{ operations: StockOperation[]; total: number }>
      ) => {
        return response.data;
      },
      providesTags: (_result, _error, arg) => {
        const tags: Array<{ type: "StockOperations"; id?: string }> = [
          { type: "StockOperations" },
        ];
        if (arg.productId) {
          tags.push({ type: "StockOperations", id: arg.productId });
        }
        return tags;
      },
      keepUnusedDataFor: 60, // Cache for 1 minute
    }),

    createStockOperation: builder.mutation<
      {
        operation: StockOperation;
        orderUpdated?: boolean;
        orderStatus?: string;
      },
      CreateStockOperationRequest
    >({
      query: (data) => ({
        url: "/api/stock-operations",
        method: "POST",
        body: data,
      }),
      transformResponse: (
        response: ApiResponse<{
          operation: StockOperation;
          orderUpdated?: boolean;
          orderStatus?: string;
        }>
      ) => response.data,
      invalidatesTags: (_result, _error, arg) => [
        { type: "StockOperations" },
        { type: "StockOperations", id: arg.productId },
        { type: "Products" },
      ],
    }),
  }),
});

export const {
  useGetAllStoresQuery,
  useGetProductsByStoreQuery,
  useUpdateProductStockMutation,
  useGetStockOperationsQuery,
  useCreateStockOperationMutation,
} = inventoryApi;
