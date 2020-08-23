import ensureAuth from '~/src/middleware/ensureAuth';
import { autoUnlockQueue } from '~/src/redis-queue';

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

require('~/src/queues/auto-unlock');

async function handle(req, res, resolve) {
  const { refresh_token: refreshToken } = req;
  const {
    token,
    uid,
    service_id: serviceId,
    unlock_going_forward: unlockGoingForward = false,
    unlock_historic: unlockHistoric = false,
  } = req.body;

  const origin = GOOGLE_OAUTH_REDIRECT_URI;

  try {
    const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;

    autoUnlockQueue.add({
      uid,
      user: req.user,
      token,
      origin,
      refreshToken,
      serviceEndpoint,
      unlockHistoric,
      unlockGoingForward,
    });

    res.json({ status: 'ok' });
    return resolve();
  } catch (e) {
    console.log(e);
    res.send(e);
    return resolve();
  }
}

export default ensureAuth(handle);
