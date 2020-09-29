import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const {
    // on_previous_emails_count: previousEmailsCount = 10,
    selected_table_data: selectedTableData,
    search_query: searchQuery,
    camelot_method: camelotMethod,
    camelot_scale: camelotScale,
    // [TODO] accept these as user inputs
    attachment_password: attachmentPassword = 'BCCPG2423G',
    gsheet_id: gSheetId = '19ipD_wfVDaI0pCCasGYjBGHz0BQP6Mh7PrmM0jX2cXE',
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
      rules,
      selectedTableData,
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
              method: 'POST',
              url: `${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/google-spreadsheet/preview`,
              data: {
                uid,
                token,
                refresh_token: refreshToken,
                data_endpoint: dataEndpoint,
                gsheet_id: gSheetId,
              },
            },
          },
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
