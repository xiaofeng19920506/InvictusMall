/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001",
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "98.115.143.29",
        port: "9000",
        pathname: "/images/**",
      },
    ],
  },
};

module.exports = nextConfig;


