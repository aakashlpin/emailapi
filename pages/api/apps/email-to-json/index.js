import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

const findLastIndex = require('lodash/findLastIndex');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const APP_HOST = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const { refresh_token: refreshToken } = req;
  const {
    token,
    uid,
    service_id: serviceId,
    new_only: newOnly = false,
    api_only: apiOnly = false,
  } = req.body;

  try {
    const apiId = generateUniqueId();
    const endpoint = `${EMAILAPI_DOMAIN}/${uid}/${apiId}`;

    res.json({ endpoint });

    const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;

    const { data: serviceData } = await axios(serviceEndpoint);
    const { data } = serviceData;
    let { search_query: searchQuery } = serviceData;
    if (newOnly) {
      const hasData = Array.isArray(data) && data.length;

      if (hasData) {
        const lastSuccessfulDataEntry = findLastIndex(
          data,
          (item) => item.is_successful,
        );

        if (lastSuccessfulDataEntry >= 0) {
          const lastProcessingTimestamp = parseInt(
            new Date(data[lastSuccessfulDataEntry]._createdOn).getTime() / 1000,
            10,
          );

          if (lastProcessingTimestamp) {
            searchQuery = `${searchQuery} after:${lastProcessingTimestamp}`;
          }
        }
      }
    }

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
      _nextQueue: 'emailToJsonQueue',
      _nextQueueData: {
        endpoint,
        userProps,
        serviceEndpoint,
      },
      completionNotifications: {
        success: [
          {
            type: 'email',
            data: {
              to: user.email,
              subject: `👋🏽 emailapi for "${searchQuery}" is ready!`,
              body: `
                Hello ${user.given_name || user.name},<br/><br/>
                Here's the <a href="${endpoint}">data endpoint</a> for emails belonging to search query ${searchQuery}.<br/><br/>
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
              method: 'POST',
              url: `${APP_HOST}/api/apps/email-to-json/webhook`,
              data: {
                apiId,
                serviceEndpoint,
                success: true,
              },
            },
          },
        ],
      },
    });

    const dataEntry = {
      _createdOn: new Date().toISOString(),
      id: apiId,
      is_pending: true,
    };

    const contentAtServiceEndpoint = {
      ...serviceData,
      data: Array.isArray(serviceData.data)
        ? [...serviceData.data, dataEntry]
        : [dataEntry],
    };

    await axios.put(serviceEndpoint, contentAtServiceEndpoint);

    return resolve();
  } catch (e) {
    console.log(e);
    return resolve();
  }
}

export default ensureAuth(handle);
