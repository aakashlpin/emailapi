import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';
import { getSearchQuery } from '~/src/apps/utils';

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const APP_HOST = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

require('~/src/queues');

async function handle(req, res, resolve) {
  const { refresh_token: refreshToken } = req;
  const {
    token,
    uid,
    service_id: serviceId,
    api_only: apiOnly,
    new_only: newOnly = false,
  } = req.body;

  const apiId = generateUniqueId();
  const endpoint = `${EMAILAPI_DOMAIN}/${uid}/${apiId}`;

  res.json({ endpoint });

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;
  const searchQuery = await getSearchQuery({
    serviceEndpoint,
    newOnly,
  });

  const {
    data: { unlock_password: unlockPassword },
  } = await axios(serviceEndpoint);

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
    completionNotifications: {
      success: {
        notifyConditions: {
          childJobsGotCreated: true,
        },
        notifications: [
          {
            type: 'webhook',
            data: {
              method: 'POST',
              url: `${APP_HOST}/api/apps/auto-unlock/webhook`,
              data: {
                apiId,
                serviceEndpoint,
                success: true,
              },
            },
          },
        ],
      },
    },
  });

  return resolve();
}

export default ensureAuth(handle);
