const withCSS = require('@zeit/next-css');
require('./env');
const aliases = require('./alias-config');

module.exports = withCSS({
  env: {
    PROJECT_ROOT: __dirname,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY: process.env.FIREBASE_PUBLIC_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    NEXT_PUBLIC_EMAILAPI_DOMAIN: process.env.EMAILAPI_DOMAIN,
    FORWARD_EMAILID_REFRESH_TOKEN: process.env.FORWARD_EMAILID_REFRESH_TOKEN,
    SESSION_SECRET_CURRENT: process.env.SESSION_SECRET_CURRENT,
    SESSION_SECRET_PREVIOUS: process.env.SESSION_SECRET_PREVIOUS,
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
