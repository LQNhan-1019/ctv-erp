import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Tạm tắt tối ưu ảnh để Cloudflare không đòi Worker liên kết
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.trycloudflare.com'],
    },
  },
};

export default nextConfig;