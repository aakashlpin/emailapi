import axios from 'axios';
import flatten from 'lodash/flatten';

import applyConfigOnEmail from '../isomorphic/applyConfigOnEmail';
import ensureConfiguration from '../isomorphic/ensureConfiguration';
import { emailToJsonQueue } from '../redis-queue';

// const mailgun = require('mailgun-js');

// const GOOGLE_OAUTH_REDIRECT_URI =
//   process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;
const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
// const { MAILGUN_API_KEY } = process.env;
// const { MAILGUN_DOMAIN } = process.env;

// const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

async function processJob(jobData, done) {
  const { emails, queueData } = jobData;

  const {
    endpoint,
    userProps: { uid },
    // isMailbox,
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
      emails
        .map((email) => ({
          ...applyConfigOnEmail(email.message, config),
          email_date: email.date,
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

  // await axios.put(serviceEndpoint, {
  //   ...contentAtServiceEndpoint,
  //   data: contentAtServiceEndpoint.data.map((dataItem) =>
  //     dataItem.id === dataEntry.id
  //       ? {
  //           ...dataItem,
  //           is_pending: false,
  //           is_successful: postedDataCount > 0,
  //           _isReadyOn: new Date().toISOString(),
  //         }
  //       : dataItem,
  //   ),
  // });

  // if (apiOnly) {
  //   console.log('[apiOnly=true] not sending email');
  //   return done();
  // }

  // const mailboxEmail = isMailbox ? searchQuery.split(':')[1] : null;

  // const emailOpts = {
  //   from: 'emailapi.io <notifications@m.emailapi.io>',
  //   to: user.email,
  //   subject: `👋🏽 Your emailapi for "${searchQuery}" is ready!`,
  //   'h:Reply-To': 'aakash@emailapi.io',
  //   html: `
  //     Hello ${user.given_name || user.name},<br/><br/>
  //     As promised, here's your <a href="${endpoint}">data endpoint</a> for ${
  //     mailboxEmail
  //       ? `mailbox at "${mailboxEmail}"`
  //       : `search query "${searchQuery}"`
  //   } .<br/><br/>
  //     emailapi.io uses a hosted version of jsonbox.io as its underlying database. <a href="https://github.com/vasanthv/jsonbox#read">Follow its docs</a> for further instructions on how to use your new data endpoint.<br/><br/>
  //     If you've got a question or a comment, or if you'd like to say hi (that's a nice thing to do), hit reply!<br/><br/>
  //     Thanks,<br/>
  //     Aakash
  //   `,
  // };
  // mg.messages().send(emailOpts, (error, body) => {
  //   if (error) {
  //     console.log('error', error);
  //   }
  //   if (body) {
  //     console.log('mailgun res', body);
  //   }
  //   console.log('[DONE] populate-service', error, body);
  //   return done();
  // });
}

(() => {
  emailToJsonQueue.process((job, done) => {
    console.log('emailToJsonQueue job data', job.data);
    processJob(job.data, done);
  });
})();
