import type { NextConfig } from "next";
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Incluir apenas o locale português brasileiro do Moment.js
    config.plugins.push(
      new MomentLocalesPlugin({
        localesToKeep: ['pt-br'],
      })
    );
    
    return config;
  },
  /* config options here */
};

export default nextConfig;
