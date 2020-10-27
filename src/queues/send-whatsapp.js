import axios from 'axios';
import queues from '~/src/redis-queue';
import Sentry from '~/src/sentry';

const { WA_API_URI, WA_API_KEY } = process.env;

async function processJob(job) {
  const {
    data: { path, args },
  } = job;

  try {
    axios.post(
      `${WA_API_URI}${path}`,
      {
        args,
      },
      {
        headers: {
          key: WA_API_KEY,
        },
      },
    );
  } catch (e) {
    Sentry.captureException(e);
    Promise.reject(e);
  }
}

(() => {
  queues.sendWhatsAppQueue.process(async (job) => {
    console.log('processing sendWhatsAppQueue job#', job.id);
    await processJob(job);
  });
})();
