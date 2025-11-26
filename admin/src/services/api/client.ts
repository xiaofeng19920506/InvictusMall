import axios from "axios";

// API base URL - pointing to your backend server
// Use VITE_API_URL environment variable or default to localhost:3001
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Always include credentials (cookies) for authentication
});

// Request interceptor - Add Bearer token from localStorage if available
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (fallback when cookies don't work)
    const token = localStorage.getItem("staff_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export { api, API_BASE_URL };
export default api;

