import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Xóa cache wrangler
  // chỉnh tên trong packege.json
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.trycloudflare.com'],
    },
  },
};

export default nextConfig;
