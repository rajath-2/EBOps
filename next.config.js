/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@cascadeflow/core',
      '@cascadeflow/ml',
      'onnxruntime-node',
      '@huggingface/transformers'
    ],
  },
};

module.exports = nextConfig;
