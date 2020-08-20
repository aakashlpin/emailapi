import ensureAuth from '~/src/middleware/ensureAuth';
import queue from '~/src/redis-queue';

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

require('~/src/createapi-qprocess');

async function handle(req, res, resolve) {
  const { refresh_token: refreshToken } = req;
  const {
    token,
    uid,
    service_id: serviceId,
    isMailbox,
    new_only: newOnly = false,
    api_only: apiOnly = false,
  } = req.body;
  const origin = GOOGLE_OAUTH_REDIRECT_URI;
  try {
    const uniqueDataEndpoint = generateUniqueId();
    const endpoint = `${EMAILAPI_DOMAIN}/${uid}/${uniqueDataEndpoint}`;

    res.json({ endpoint });

    const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${
      isMailbox ? 'mailbox' : 'services'
    }/${serviceId}`;

    queue.add({
      uid,
      user: req.user,
      token,
      origin,
      apiOnly,
      newOnly,
      endpoint,
      isMailbox,
      refreshToken,
      serviceEndpoint,
      uniqueDataEndpoint,
    });
    return resolve();
  } catch (e) {
    console.log(e);
    return resolve();
  }
}

export default ensureAuth(handle);
