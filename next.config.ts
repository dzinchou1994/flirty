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
    // heic-convert pulls libheif's wasm through a dynamic require that the
    // bundler cannot statically follow ("dependencies cannot be statically
    // extracted"). Bundling it produces a module that throws at runtime, so
    // every iPhone HEIC upload failed. Keep these external and trace the wasm.
    'heic-convert',
    'heic-decode',
    'libheif-js',
  ],
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@tensorflow/tfjs-node/lib/**/*',
      './node_modules/@tensorflow/tfjs-node/deps/**/*',
      './node_modules/@vladmandic/face-api/model/**/*',
      './node_modules/nsfwjs/dist/models/mobilenet_v2/**/*',
      './node_modules/libheif-js/**/*',
      './node_modules/heic-decode/**/*',
      './node_modules/heic-convert/**/*',
    ],
  },
  experimental: {
    middlewareClientMaxBodySize: '4mb',
  },
};

export default nextConfig;
