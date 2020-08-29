import axios from 'axios';
import queues from '~/src/redis-queue';

const normalizeHtmlWhitespace = require('normalize-html-whitespace');

async function sendEmail({ to, subject, body }) {
  queues.sendEmailQueue.add({
    to,
    subject,
    html: normalizeHtmlWhitespace(body),
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

  return Promise.resolve();
}

(() => {
  queues.notificationsQueue.process(async (job) => {
    console.log('notificationsQueue job data', job.data);
    await processJob(job);
  });
})();
