import axios from 'axios';
import queues from '~/src/redis-queue';
import Sentry from '~/src/sentry';

const normalizeHtmlWhitespace = require('normalize-html-whitespace');

async function sendEmail({ to, subject, body }) {
  queues.sendEmailQueue.add({
    to,
    subject,
    html: normalizeHtmlWhitespace(body),
  });
}

async function sendWebhook({ url, data, method }) {
  console.log('🔼 sendWebhook running:', { url, data, method });
  try {
    const response = await axios[method.toLowerCase()](url, data);
    console.log('⬇️ sendWebhook success:', response.data);
  } catch (e) {
    console.log('🚨  sendWebhook error:', e);
    Sentry.captureException(e);
  }
}

async function processJob(job) {
  try {
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
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
  }

  Promise.resolve();
}

(() => {
  queues.notificationsQueue.process(async (job) => {
    console.log('processing notificationsQueue job#', job.id);
    await processJob(job);
  });
})();
