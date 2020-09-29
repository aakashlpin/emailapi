/* eslint-disable no-shadow */
import axios from 'axios';
import flatten from 'lodash/flatten';
import Sentry from '~/src/sentry';

import applyConfigOnEmail from '../isomorphic/applyConfigOnEmail';
import ensureConfiguration from '../isomorphic/ensureConfiguration';
import queues from '../redis-queue';

const EMAILAPI_DOMAIN = process.env.JSONBOX_NETWORK_URL;

async function processJob(jobData, done) {
  try {
    const { email, queueData } = jobData;

    const {
      endpoint,
      userProps: { uid },
      serviceEndpoint,
    } = queueData;

    const { data: serviceData } = await axios(serviceEndpoint);
    const { configurations } = serviceData;

    const remoteConfigurations = (
      await Promise.all(
        configurations.map((configId) =>
          axios(`${EMAILAPI_DOMAIN}/${uid}/configurations/${configId}`),
        ),
      )
    ).map((response) => response.data);

    const emailapi = flatten(
      remoteConfigurations.map((config) =>
        [email]
          .map((_email) => ({
            ...applyConfigOnEmail(_email.message, config),
            email_date: _email.date,
          }))
          .filter((extactedData) => ensureConfiguration(extactedData, config)),
      ),
    );

    try {
      if (emailapi.length) {
        console.log('[bg] posting data', emailapi);
        await axios.post(endpoint, emailapi);
        if (serviceData.webhook_url) {
          try {
            await axios.post(serviceData.webhook_url, {
              data: emailapi,
              endpoint,
            });
          } catch (e) {
            Sentry.captureException(e);
            console.log(e);
          }
        }
      } else {
        console.log('[bg] no data to post');
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log('error in posting');
      console.log(e);
      const { message } = 'response' in e ? e.response.data : {};
      if (message) {
        await axios.post(endpoint, {
          error: message,
          action:
            "If you believe something's not right, contact help@emailapi.io",
        });
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }

  done();
}

(() => {
  queues.emailToJsonQueue.process(10, (job, done) => {
    console.log('processing emailToJsonQueue job#', job.id);
    processJob(job.data, done);
  });
})();
