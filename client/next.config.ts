import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Use environment variable for server IP, or default to localhost
    // Set NEXT_PUBLIC_API_URL=http://[server-ip]:3001 to connect to server on another machine
    NEXT_PUBLIC_API_URL: 
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '98.115.143.29',
        port: '9000',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
