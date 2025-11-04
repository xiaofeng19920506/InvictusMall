import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Use environment variable for server IP, or default to localhost
    // Set NEXT_PUBLIC_API_URL=http://[server-ip]:3001 to connect to server on another machine
    NEXT_PUBLIC_API_URL: 
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_DEV_BASE_BACKEND_URL || 
      'http://localhost:3001',
  },
};

export default nextConfig;
