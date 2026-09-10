import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // Only proxy /api to local Express in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;