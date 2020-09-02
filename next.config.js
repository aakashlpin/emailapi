const withCSS = require('@zeit/next-css');
const aliases = require('./alias-config');

module.exports = withCSS({
  env: {
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY: process.env.FIREBASE_PUBLIC_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI:
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
    NEXT_PUBLIC_EMAILAPI_DOMAIN: process.env.EMAILAPI_DOMAIN,
    NEXT_PUBLIC_EMAILAPI_BASE_URL: process.env.EMAILAPI_BASE_URL,
    SESSION_SECRET_CURRENT: process.env.SESSION_SECRET_CURRENT,
    SESSION_SECRET_PREVIOUS: process.env.SESSION_SECRET_PREVIOUS,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    NEXT_PUBLIC_SENDING_EMAIL_ID: process.env.MAILGUN_SENDING_EMAIL_ID,
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
