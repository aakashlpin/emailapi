import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const SELF_DOMAIN = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const {
    // [TODO] accept post processing endpoint here
    search_query: searchQuery,
    camelot_method: camelotMethod,
    camelot_scale: camelotScale,
    attachment_password: attachmentPassword,
    post_processing_endpoint: postProcessingEndpoint = `${SELF_DOMAIN}/api/webhooks/zerodha-cn`,
    rules,
    uid,
    token,
  } = req.body;

  const { user, refresh_token: refreshToken } = req;
  const userProps = {
    uid,
    user,
    token,
    refreshToken,
  };

  const dataEndpointId = generateUniqueId();
  const dataEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${dataEndpointId}`;

  const statusCheckerHostEndpointId = generateUniqueId();
  const statusCheckerHostEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${statusCheckerHostEndpointId}`;

  const { data: statusCheckerHostCollection } = await axios.post(
    statusCheckerHostEndpoint,
    {
      pending: true,
      success: false,
    },
  );

  const { _id: statusCheckerEndpointId } = statusCheckerHostCollection;
  const statusCheckerEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${statusCheckerEndpointId}`;

  res.json({ dataEndpoint, statusCheckerEndpoint });

  queues.mailFetchQueue.add({
    userProps,
    searchQuery,
    _nextQueue: 'pdfExtractionQueue',
    _nextQueueData: {
      dataEndpoint,
      postProcessingEndpoint,
      rules,
      camelotMethod,
      camelotScale,
      attachmentPassword,
    },
    initNotifications: [
      {
        type: 'webhook',
        data: {
          method: 'PUT',
          url: statusCheckerEndpoint,
          data: {
            pending: true,
            success: false,
            init: true,
          },
        },
      },
    ],
    pendingWebhookNotifications: [
      {
        method: 'PUT',
        url: statusCheckerEndpoint,
        data: {
          pending: true,
          success: false,
        },
      },
    ],
    completionNotifications: {
      success: {
        notifyConditions: {
          hasDataAtEndpoint: dataEndpoint,
        },
        notifications: [
          {
            type: 'webhook',
            data: {
              method: 'PUT',
              url: statusCheckerEndpoint,
              data: {
                pending: false,
                success: true,
              },
            },
          },
        ],
      },
    },
  });

  resolve();
}

export default ensureAuth(handle);
