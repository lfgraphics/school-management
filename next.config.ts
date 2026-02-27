import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'g2sfr84d-3000.inc1.devtunnels.ms']
    }
  }
};

export default nextConfig;
