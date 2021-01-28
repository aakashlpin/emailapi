import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';
import { TEMPLATE_TYPE } from '~/src/pdf/enums';

require('~/src/queues');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const { JSONBOX_NETWORK_URL, NEXT_PUBLIC_EMAILAPI_DOMAIN } = process.env;
const SELF_DOMAIN = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const {
    // [TODO] accept post processing endpoint here
    search_query: searchQuery,
    camelot_method: camelotMethod,
    camelot_scale: camelotScale,
    attachment_password: attachmentPassword,
    template,
    rules,
    uid,
    token,
  } = req.body;

  let postProcessingEndpoint;
  if (template === TEMPLATE_TYPE.ZERODHA_CN) {
    postProcessingEndpoint = `${SELF_DOMAIN}/api/webhooks/zerodha-cn`;
  }

  const { user, refresh_token: refreshToken } = req;
  const userProps = {
    uid,
    user,
    token,
    refreshToken,
  };

  const dataEndpointId = generateUniqueId();
  const dataEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/${dataEndpointId}`;
  const dataPublicEndpoint = `${NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/${dataEndpointId}`;

  const statusCheckerHostEndpointId = generateUniqueId();
  const statusCheckerHostEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/${statusCheckerHostEndpointId}`;

  const { data: statusCheckerHostCollection } = await axios.post(
    statusCheckerHostEndpoint,
    {
      pending: true,
      success: false,
    },
  );

  const { _id: statusCheckerEndpointId } = statusCheckerHostCollection;
  const statusCheckerEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/${statusCheckerEndpointId}`;
  const statusCheckerPublicEndpoint = `${NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/${statusCheckerEndpointId}`;

  res.json({
    dataEndpoint: dataPublicEndpoint,
    statusCheckerEndpoint: statusCheckerPublicEndpoint,
  });

  queues.mailFetchQueue.add({
    userProps,
    searchQuery,
    singlePageRun: false,
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
            type: 'email',
            data: {
              to: user.email,
              subject:
                template === TEMPLATE_TYPE.ZERODHA_CN
                  ? `👋🏽 Your preview data from Zerodha CN is ready!`
                  : `👋🏽 Your preview PDF data for "${searchQuery}" is ready!`,
              body: `
                Hello ${user.given_name || user.name},<br/><br/>
                Here's the <a href="${dataPublicEndpoint}">data endpoint</a> for attachments belonging to search query ${searchQuery}.<br/><br/>
                emailapi.io uses a hosted version of jsonbox.io as its underlying database. <a href="https://github.com/vasanthv/jsonbox#read">Follow its docs</a> for further instructions on how to use your new data endpoint.<br/><br/>
                If you've got a question or a comment, or if you'd like to say hi (that's a nice thing to do), hit reply!<br/><br/>
                Thanks,<br/>
                Aakash
              `,
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
