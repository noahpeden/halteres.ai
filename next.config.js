/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set longer timeouts for serverless functions (5 minutes)
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
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
    ];
  },
};

module.exports = nextConfig;
