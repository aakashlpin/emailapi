import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';
import { getSearchQuery } from '~/src/apps/utils';

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const { NEXT_PUBLIC_EMAILAPI_DOMAIN, JSONBOX_NETWORK_URL } = process.env;
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
  const endpoint = `${JSONBOX_NETWORK_URL}/${uid}/${apiId}`;
  const publicEndpoint = `${NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/${apiId}`;

  res.json({ endpoint: publicEndpoint });

  try {
    const serviceEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/services/${serviceId}`;
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
                  uid: userProps.uid,
                  refresh_token: userProps.refreshToken,
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
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
  }

  return resolve();
}

export default ensureAuth(handle);
