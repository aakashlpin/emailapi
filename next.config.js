const nextEnv = require('next-env');
const withPlugins = require('next-compose-plugins');
const withCSS = require('@zeit/next-css');
const aliases = require('./alias-config');

const withNextEnv = nextEnv();

const nextConfig = {
  webpack: (config) => {
    const { alias } = config.resolve;
    config.resolve.alias = { // eslint-disable-line
      ...alias,
      ...aliases,
    };
    return config;
  },
};

module.exports = withPlugins([withNextEnv, withCSS], nextConfig);
