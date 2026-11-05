import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  serverExternalPackages: [
    '@tensorflow/tfjs-node',
    '@tensorflow/tfjs',
    '@vladmandic/face-api',
    'nsfwjs',
    'buffer',
  ],
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@tensorflow/tfjs-node/lib/**/*',
      './node_modules/@tensorflow/tfjs-node/deps/**/*',
      './node_modules/@vladmandic/face-api/model/**/*',
      './node_modules/nsfwjs/dist/models/mobilenet_v2/**/*',
    ],
  },
  experimental: {
    middlewareClientMaxBodySize: '4mb',
  },
};

export default nextConfig;
