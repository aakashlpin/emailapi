import queues from '~/src/redis-queue';
import { sendEmail } from '~/src/integrations/email/mailgun';

async function processJob(job) {
  const { data: emailOptions } = job;

  await sendEmail({
    from: `emailapi.io <${process.env.MAILGUN_SENDING_EMAIL_ID}>`,
    ...emailOptions,
  });
}

(() => {
  queues.sendEmailQueue.process(async (job) => {
    console.log('sendEmailQueue job data', job.data);
    await processJob(job);
  });
})();
