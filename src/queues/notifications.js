import axios from 'axios';
import queues from '~/src/redis-queue';

const mailgun = require('mailgun-js');
const normalizeHtmlWhitespace = require('normalize-html-whitespace');

const { MAILGUN_API_KEY } = process.env;
const { MAILGUN_DOMAIN } = process.env;

const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

async function sendEmail({ to, subject, body }) {
  const emailOpts = {
    from: 'emailapi.io <notifications@m.emailapi.io>',
    to,
    subject,
    html: normalizeHtmlWhitespace(body),
  };

  return new Promise((resolve, reject) => {
    mg.messages().send(emailOpts, (error, res) => {
      if (error) {
        console.log('error from mailgun api', error);
        return reject(new Error(error));
      }
      if (!error && !res) {
        const ERR = 'something went wrong sending email...';
        console.log(ERR);
        return reject(new Error(ERR));
      }
      return resolve();
    });
  });
}

async function sendWebhook({ url, data, method }) {
  await axios[method.toLowerCase()](url, data);
}

async function processJob(job) {
  const { data: jobData } = job;
  const { type } = jobData;

  switch (type) {
    case 'email': {
      const { data: emailData } = jobData;
      await sendEmail(emailData);
      break;
    }

    case 'webhook': {
      const { data: webhookData } = jobData;
      await sendWebhook(webhookData);
      break;
    }

    default: {
      Promise.resolve();
      break;
    }
  }
}

(() => {
  queues.notificationsQueue.process(async (job) => {
    console.log('notificationsQueue job data', job.data);
    await processJob(job);
  });
})();
