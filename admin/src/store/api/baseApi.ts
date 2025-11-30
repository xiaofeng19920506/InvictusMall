import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    // Get token from localStorage (fallback when cookies don't work)
    const token = localStorage.getItem("staff_auth_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Staff",
    "Stores",
    "Orders",
    "ActivityLogs",
    "Products",
    "Categories",
    "StockOperations",
  ],
  endpoints: () => ({}),
});
