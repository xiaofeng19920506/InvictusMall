import axios, {AxiosInstance, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Using environment variable from expo-constants instead of react-native-config
import Constants from 'expo-constants';
import type {
  ApiResponse,
  Shipment,
  Product,
  Order,
  StockOperation,
} from '../types';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('staff_auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          await AsyncStorage.removeItem('staff_auth_token');
          await AsyncStorage.removeItem('staff_user');
        }
        return Promise.reject(error);
      },
    );
  }

  private handleError(error: any, defaultMessage: string): Error {
    if (error.response?.data) {
      const apiError = error.response.data;
      const errorMessage = apiError.message || apiError.error || defaultMessage;
      const newError = new Error(errorMessage);
      (newError as any).response = error.response;
      return newError;
    }
    return new Error(error.message || defaultMessage);
  }

  // Shipment APIs
  async getAllShipments(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{shipments: Shipment[]; total: number}>> {
    const response = await this.api.get('/api/admin/shipments', {params});
    return response.data;
  }

  async getShipmentById(id: string): Promise<ApiResponse<Shipment>> {
    const response = await this.api.get(`/api/admin/shipments/${id}`);
    return response.data;
  }

  async getShipmentsByOrderId(orderId: string): Promise<ApiResponse<Shipment[]>> {
    const response = await this.api.get(`/api/admin/shipments/order/${orderId}`);
    return response.data;
  }

  async createShipment(data: {
    orderId: string;
    trackingNumber: string;
    carrier: string;
    carrierName: string;
    status: string;
    shippingMethod?: string;
    weight?: number;
    shippingCost?: number;
    notes?: string;
  }): Promise<ApiResponse<Shipment>> {
    const response = await this.api.post('/api/admin/shipments', data);
    return response.data;
  }

  async updateShipment(
    id: string,
    data: Partial<Shipment>,
  ): Promise<ApiResponse<Shipment>> {
    const response = await this.api.put(`/api/admin/shipments/${id}`, data);
    return response.data;
  }

  async updateShipmentStatus(
    id: string,
    status: string,
    description?: string,
  ): Promise<ApiResponse<Shipment>> {
    const response = await this.api.post(`/api/admin/shipments/${id}/tracking`, {
      status,
      description,
    });
    return response.data;
  }

  // Product APIs
  async getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    const response = await this.api.get(`/api/products/barcode/${barcode}`);
    return response.data;
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await this.api.get(`/api/products/${id}`);
    return response.data;
  }

  // Order APIs
  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    const response = await this.api.get(`/api/orders/${id}`);
    return response.data;
  }

  async getOrderByBarcode(barcode: string): Promise<ApiResponse<Order>> {
    // Assuming order ID can be used as barcode or we have a search endpoint
    return this.getOrderById(barcode);
  }

  // Stock Operations
  async createStockOperation(
    data: {
      productId: string;
      type: 'in' | 'out';
      quantity: number;
      reason?: string;
      orderId?: string;
    },
  ): Promise<ApiResponse<{
    operation: StockOperation;
    orderUpdated?: boolean;
    orderStatus?: string;
  }>> {
    try {
      const response = await this.api.post('/api/stock-operations', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create stock operation');
    }
  }

  async getStockOperations(params?: {
    productId?: string;
    type?: 'in' | 'out';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{operations: StockOperation[]; total: number}>> {
    const response = await this.api.post('/api/admin/inventory/operations', data);
    return response.data;
  }

  async getStockOperations(params?: {
    productId?: string;
    type?: 'in' | 'out';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{operations: StockOperation[]; total: number}>> {
    try {
      const response = await this.api.get('/api/stock-operations', {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to fetch stock operations');
    }
  }
}

export const apiService = new ApiService();
export default apiService;

