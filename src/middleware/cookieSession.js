import cookieSession from 'cookie-session';

const { SESSION_SECRET_CURRENT = 'current' } = process.env;
const { SESSION_SECRET_PREVIOUS = 'previous' } = process.env;

export const addSession = (req, res) => {
  // Ensure that session secrets are set.
  if (!(SESSION_SECRET_CURRENT && SESSION_SECRET_PREVIOUS)) {
    throw new Error(
      'Session secrets must be set as env vars `SESSION_SECRET_CURRENT` and `SESSION_SECRET_PREVIOUS`.',
    );
  }

  // An array is useful for rotating secrets without invalidating old sessions.
  // The first will be used to sign cookies, and the rest to validate them.
  // https://github.com/expressjs/cookie-session#keys
  const sessionSecrets = [SESSION_SECRET_CURRENT, SESSION_SECRET_PREVIOUS];

  // Example:
  // https://github.com/billymoon/micro-cookie-session
  const includeSession = cookieSession({
    keys: sessionSecrets,
    // TODO: set other options, such as "secure", "sameSite", etc.
    // https://github.com/expressjs/cookie-session#cookie-options
    maxAge: 604800000, // week
    httpOnly: true,
    overwrite: true,
  });
  includeSession(req, res, () => {});
};

export default (handler) => (req, res) => {
  return new Promise((resolve) => {
    try {
      addSession(req, res);
    } catch (e) {
      res.status(500).json({ error: 'Could not get user session.' });
      return resolve();
    }
    return handler(req, res, resolve);
  });
};
