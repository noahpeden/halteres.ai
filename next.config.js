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
    ];
  },
};

module.exports = nextConfig;
