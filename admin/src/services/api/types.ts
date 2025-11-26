// Common API types
// Note: ApiResponse is also defined in shared/types/store.ts
// This is a compatible version for API modules
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
}

// Re-export shared types
export type {
  Store,
  Location,
  CreateStoreRequest,
  UpdateStoreRequest,
} from "../../shared/types/store";

