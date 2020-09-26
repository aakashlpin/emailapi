import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;

async function handle(req, res, resolve) {
  const {
    // on_previous_emails_count: previousEmailsCount = 10,
    selected_table_data: selectedTableData,
    search_query: searchQuery,
    camelot_method: camelotMethod,
    camelot_scale: camelotScale,
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

  const statusCheckerEndpointId = generateUniqueId();
  const statusCheckerEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${statusCheckerEndpointId}`;

  res.json({ dataEndpoint, statusCheckerEndpoint });

  queues.mailFetchQueue.add({
    userProps,
    searchQuery,
    _nextQueue: 'pdfExtractionQueue',
    _nextQueueData: {
      dataEndpoint,
      rules,
      selectedTableData,
      camelotMethod,
      camelotScale,
    },
    initNotifications: [
      {
        type: 'webhook',
        data: {
          method: 'POST',
          url: statusCheckerEndpoint,
          data: {
            pending: true,
            success: false,
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
