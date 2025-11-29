import axios, { AxiosInstance, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Using environment variable from expo-constants instead of react-native-config
import Constants from "expo-constants";
import type {
  ApiResponse,
  Shipment,
  Product,
  Order,
  StockOperation,
  Store,
} from "../types";

// Determine API URL based on device type
// Simulator/emulator should use localhost, real devices should use network IP
const getApiBaseUrl = (): string => {
  // Check if running on simulator/emulator
  // Constants.isDevice can be undefined in some cases, so we need to handle that
  const isDevice = Constants.isDevice;
  const deviceId = Constants.deviceId || "";
  const isSimulator =
    deviceId.includes("Simulator") || deviceId.includes("Emulator");

  // Helper to detect if likely running on simulator
  // Simulators typically have "Simulator" in deviceId, or isDevice is explicitly false
  const isLikelySimulator =
    isSimulator || (isDevice !== undefined && !isDevice);

  const deviceApiUrl = Constants.expoConfig?.extra?.deviceApiUrl;
  const simulatorApiUrl = Constants.expoConfig?.extra?.simulatorApiUrl;
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  // Priority 1: If API_BASE_URL is explicitly set, use it (overrides everything)
  if (
    apiUrl &&
    !apiUrl.includes("localhost") &&
    !apiUrl.includes("127.0.0.1")
  ) {
    return apiUrl;
  }

  // Priority 2: For simulators/emulators, use simulatorApiUrl or localhost
  if (isLikelySimulator) {
    return simulatorApiUrl || "http://localhost:3001";
  }

  // Priority 3: For real devices OR if device detection is unclear, prefer deviceApiUrl
  // This ensures that if deviceApiUrl is configured, it will be used (safer for real devices)
  if (deviceApiUrl) {
    return deviceApiUrl;
  }

  // Priority 3: If isDevice is true (explicitly a real device), try to use deviceApiUrl
  // But if not set, check if apiUrl is set and warn
  if (isDevice === true) {
    // Real device but no deviceApiUrl - try apiUrl as fallback
    if (Constants.expoConfig?.extra?.apiUrl) {
      return Constants.expoConfig.extra.apiUrl;
    }
    return "http://localhost:3001";
  }

  // Priority 4: If isDevice is undefined (unknown state), check apiUrl as fallback
  // If apiUrl is set and not localhost, use it (likely network IP)
  if (apiUrl) {
    // If apiUrl is not localhost, use it (likely network IP for real device)
    if (!apiUrl.includes("localhost") && !apiUrl.includes("127.0.0.1")) {
      return apiUrl;
    }
  }

  // Last resort: Default to localhost (will work for simulators, not for real devices)
  return "http://localhost:3001";
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000, // 15 second timeout for all requests
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to attach auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem("staff_auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          await AsyncStorage.removeItem("staff_auth_token");
          await AsyncStorage.removeItem("staff_user");
        }
        return Promise.reject(error);
      }
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
  }): Promise<ApiResponse<{ shipments: Shipment[]; total: number }>> {
    const response = await this.api.get("/api/admin/shipments", { params });
    return response.data;
  }

  async getShipmentById(id: string): Promise<ApiResponse<Shipment>> {
    const response = await this.api.get(`/api/admin/shipments/${id}`);
    return response.data;
  }

  async getShipmentsByOrderId(
    orderId: string
  ): Promise<ApiResponse<Shipment[]>> {
    const response = await this.api.get(
      `/api/admin/shipments/order/${orderId}`
    );
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
    const response = await this.api.post("/api/admin/shipments", data);
    return response.data;
  }

  async updateShipment(
    id: string,
    data: Partial<Shipment>
  ): Promise<ApiResponse<Shipment>> {
    const response = await this.api.put(`/api/admin/shipments/${id}`, data);
    return response.data;
  }

  async updateShipmentStatus(
    id: string,
    status: string,
    description?: string
  ): Promise<ApiResponse<Shipment>> {
    const response = await this.api.post(
      `/api/admin/shipments/${id}/tracking`,
      {
        status,
        description,
      }
    );
    return response.data;
  }

  // Product APIs
  async getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    try {
      const response = await this.api.get(`/api/products/barcode/${barcode}`);
      return response.data;
    } catch (error: any) {
      // If 404, product doesn't exist - return a structured response
      if (error.response?.status === 404) {
        return {
          success: false,
          message: "Product not found",
        };
      }
      // Re-throw other errors
      throw this.handleError(error, "Failed to fetch product by barcode");
    }
  }

  async createProduct(data: {
    storeId: string;
    name: string;
    description?: string;
    price: number;
    barcode?: string;
    stockQuantity?: number;
    category?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product>> {
    try {
      const response = await this.api.post("/api/products", data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, "Failed to create product");
    }
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
  async createStockOperation(data: {
    productId: string;
    type: "in" | "out";
    quantity: number;
    reason?: string;
    orderId?: string;
  }): Promise<
    ApiResponse<{
      operation: StockOperation;
      orderUpdated?: boolean;
      orderStatus?: string;
    }>
  > {
    try {
      const response = await this.api.post("/api/stock-operations", data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, "Failed to create stock operation");
    }
  }

  async getStockOperations(params?: {
    productId?: string;
    type?: "in" | "out";
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ operations: StockOperation[]; total: number }>> {
    try {
      const response = await this.api.get("/api/stock-operations", {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, "Failed to fetch stock operations");
    }
  }

  // OCR APIs
  async extractTextFromImage(imageUri: string): Promise<
    ApiResponse<{
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
    }>
  > {
    try {
      // Create form data
      const formData = new FormData();

      // Get file name from URI
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      const response = await this.api.post("/api/ocr/extract", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error: any) {
      throw this.handleError(error, "Failed to extract text from image");
    }
  }

  // Get stores associated with the current staff member
  async getMyStores(): Promise<ApiResponse<Store[]>> {
    try {
      const response = await this.api.get("/api/staff/my-stores");
      return response.data;
    } catch (error: any) {
      throw this.handleError(error, "Failed to fetch stores");
    }
  }
}

export const apiService = new ApiService();
export default apiService;
