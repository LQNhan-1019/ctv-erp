import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  turbopack: {
    root: process.cwd(),
  },
  // Tạm tắt tối ưu ảnh để Cloudflare không đòi Worker liên kết
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
