/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@cascadeflow/core',
      '@cascadeflow/ml',
      '@xenova/transformers',
      'onnxruntime-node',
    ],
  },
};

module.exports = nextConfig;
