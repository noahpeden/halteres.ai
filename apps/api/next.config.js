/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // workspace packages live as TS source — Next compiles them at build time.
    externalDir: true,
  },
  transpilePackages: ['@halteres/core', '@halteres/db', '@halteres/prompts', '@halteres/rag'],
};

export default nextConfig;
