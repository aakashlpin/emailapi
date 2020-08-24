import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;

require('~/src/queues/mail-fetch');
require('~/src/queues/auto-unlock');

async function handle(req, res, resolve) {
  const { refresh_token: refreshToken } = req;
  const {
    token,
    uid,
    service_id: serviceId,
    api_only: apiOnly,
    unlock_going_forward: unlockGoingForward = false,
    unlock_historic: unlockHistoric = false,
  } = req.body;

  const uniqueDataEndpoint = generateUniqueId();
  const endpoint = `${EMAILAPI_DOMAIN}/${uid}/${uniqueDataEndpoint}`;

  res.json({ endpoint });

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;

  const { data: serviceData } = await axios(serviceEndpoint);
  const {
    search_query: searchQuery,
    unlock_password: unlockPassword,
  } = serviceData;

  const { user } = req;
  const userProps = {
    uid,
    user,
    token,
    refreshToken,
  };

  queues.mailFetchQueue.add({
    apiOnly,
    userProps,
    searchQuery,
    _nextQueue: 'autoUnlockQueue',
    _nextQueueData: {
      endpoint,
      userProps,
      unlockPassword,
      serviceEndpoint,
    },
  });

  return resolve();
}

export default ensureAuth(handle);
