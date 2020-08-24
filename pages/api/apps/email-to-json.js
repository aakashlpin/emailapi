import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

const findLastIndex = require('lodash/findLastIndex');

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;

require('~/src/queues/mail-fetch');
require('~/src/queues/email-to-json');
require('~/src/queues/task-status');

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

  try {
    const uniqueDataEndpoint = generateUniqueId();
    const endpoint = `${EMAILAPI_DOMAIN}/${uid}/${uniqueDataEndpoint}`;

    res.json({ endpoint });

    const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/${
      isMailbox ? 'mailbox' : 'services'
    }/${serviceId}`;

    const { data: serviceData } = await axios(serviceEndpoint);
    const { email, data } = serviceData;
    let { search_query: searchQuery } = serviceData;
    if (isMailbox) {
      searchQuery = `to: ${email}`;
    }
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

    /**
     * [TODO]
     *
     * send a taskId here
     * which should keep track of subtasks through Ids
     * each subtask should be able to attach itself to the parent task Id
     * this subTask Id should be sent to the queue below which should mark status on success/failure
     *
     *  */

    // const taskTrackingId = generateUniqueId();
    // const taskCompletionNotif =
    queues.mailFetchQueue.add({
      apiOnly,
      userProps,
      searchQuery,
      _nextQueue: 'emailToJsonQueue',
      _nextQueueData: {
        endpoint,
        userProps,
        isMailbox,
        serviceEndpoint,
      },
    });

    const dataEntry = {
      _createdOn: new Date().toISOString(),
      id: uniqueDataEndpoint,
      is_pending: 'PENDING_IMPL',
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
