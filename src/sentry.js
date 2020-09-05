const Sentry = require('@sentry/node');

const Tracing = require('@sentry/tracing');

const { SENTRY_DSN } = process.env;

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1.0,
});

export default Sentry;

export { Tracing };
