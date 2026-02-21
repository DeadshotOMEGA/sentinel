/* global process */
import type { NextConfig } from 'next'

const backendInternalUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sentinel/contracts', '@sentinel/types', '@sentinel/database'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
