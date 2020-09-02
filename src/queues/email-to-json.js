import axios from 'axios';
import flatten from 'lodash/flatten';

import applyConfigOnEmail from '~/src/ft/email-to-json/applyConfigOnEmail';
import ensureConfiguration from '~/src/ft/email-to-json/ensureConfiguration';
import queues from '../redis-queue';

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;

// [TODO] handle error cases by wrapping in try catch
async function processJob(jobData, done) {
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
          console.log(e);
        }
      }
    } else {
      console.log('[bg] no data to post');
    }
  } catch (e) {
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

  done();

  // if (apiOnly) {
  //   console.log('[apiOnly=true] not sending email');
  //   return done();
  // }
}

(() => {
  queues.emailToJsonQueue.process(10, (job, done) => {
    console.log('emailToJsonQueue job data', job.data);
    processJob(job.data, done);
  });
})();
