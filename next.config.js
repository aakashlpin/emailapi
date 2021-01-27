const nextEnv = require('next-env');
const withPlugins = require('next-compose-plugins');
const withCSS = require('@zeit/next-css');
const aliases = require('./alias-config');

const withNextEnv = nextEnv();

console.log('inside next.config.js');
console.log({
  NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY:
    process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  NEXT_PUBLIC_EMAILAPI_DOMAIN: process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI:
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
  NEXT_PUBLIC_SENDING_EMAIL_ID: process.env.NEXT_PUBLIC_SENDING_EMAIL_ID,
});

const nextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL:
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_EMAILAPI_DOMAIN: process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI:
      process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
    NEXT_PUBLIC_SENDING_EMAIL_ID: process.env.NEXT_PUBLIC_SENDING_EMAIL_ID,
  },
  serverRuntimeConfig: {},
  webpack: (config) => {
    console.log('inside webpack');
    console.log({
      NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY:
        process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_DATABASE_URL:
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      NEXT_PUBLIC_EMAILAPI_DOMAIN: process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI:
        process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
      NEXT_PUBLIC_SENDING_EMAIL_ID: process.env.NEXT_PUBLIC_SENDING_EMAIL_ID,
    });

    const { alias } = config.resolve;
    config.resolve.alias = { // eslint-disable-line
      ...alias,
      ...aliases,
    };
    return config;
  },
};

module.exports = withPlugins([withNextEnv, withCSS], nextConfig);
