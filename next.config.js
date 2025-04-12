/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set longer timeouts for serverless functions (5 minutes)
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  serverExternalPackages: ['sharp'],
  async headers() {
    return [
      {
        source: '/api/generate-program',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'Keep-Alive',
            value: 'timeout=300',
          },
        ],
      },
      // Add CORS headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://www.halteres.ai, https://app.halteres.ai',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          { key: 'Vary', value: 'Origin' },
          { key: 'Permissions-Policy', value: 'interest-cohort=()' },
        ],
      },
    ];
  },
  // Enable CORS without using the unsupported method condition
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
