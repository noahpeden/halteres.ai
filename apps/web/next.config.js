/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  transpilePackages: ['@halteres/core', '@halteres/db'],
};

export default nextConfig;
