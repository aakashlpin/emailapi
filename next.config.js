const withCSS = require('@zeit/next-css');
require('./env');
const aliases = require('./alias-config');

module.exports = withCSS({
  env: {
    PROJECT_ROOT: __dirname,
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PUBLIC_API_KEY: process.env.FIREBASE_PUBLIC_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    EMAILAPI_DOMAIN: process.env.EMAILAPI_DOMAIN,
  },
  webpack: (config) => {
    const { alias } = config.resolve;
    config.resolve.alias = { // eslint-disable-line
      ...alias,
      ...aliases,
    };
    return config;
  },
});
