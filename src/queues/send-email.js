import queues from '~/src/redis-queue';
import { sendEmail } from '~/src/integrations/email/mailgun';
import Sentry from '~/src/sentry';

async function processJob(job) {
  const { data: emailOptions } = job;

  try {
    await sendEmail({
      from: `emailapi.io <${process.env.NEXT_PUBLIC_SENDING_EMAIL_ID}>`,
      ...emailOptions,
    });
  } catch (e) {
    Sentry.captureException(e);
    Promise.reject(e);
  }
}

(() => {
  queues.sendEmailQueue.process(async (job) => {
    console.log('processing sendEmailQueue job#', job.id);
    await processJob(job);
  });
})();
