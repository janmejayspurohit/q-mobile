import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['quizzical.ghrunilabs.ai'],
  devIndicators: false,
  output: 'standalone',
};

export default nextConfig;
