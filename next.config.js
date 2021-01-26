const nextEnv = require('next-env');
const withCSS = require('@zeit/next-css');
const aliases = require('./alias-config');

const withNextEnv = nextEnv();

module.exports = withNextEnv(
  withCSS({
    webpack: (config) => {
      const { alias } = config.resolve;
      config.resolve.alias = { // eslint-disable-line
        ...alias,
        ...aliases,
      };
      return config;
    },
  }),
);
