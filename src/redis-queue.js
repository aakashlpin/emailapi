const Queue = require('bull');
const Redis = require('ioredis');

const redisUrl = process.env.REDISCLOUD_URL;

const client = new Redis(redisUrl);
const subscriber = new Redis(redisUrl);

const opts = {
  createClient(type) {
    switch (type) {
      case 'client':
        return client;
      case 'subscriber':
        return subscriber;
      default:
        return new Redis(redisUrl);
    }
  },
};

export const redis = opts.createClient();

const queues = [
  { exportName: 'mailFetchQueue', bullName: 'mail-fetch' },
  { exportName: 'taskStatusQueue', bullName: 'task-status' },
  { exportName: 'notificationsQueue', bullName: 'notifications' },
  { exportName: 'autoUnlockQueue', bullName: 'auto-unlock', childQueue: true },
  {
    exportName: 'emailToJsonQueue',
    bullName: 'email-to-json',
    childQueue: true,
  },
  {
    exportName: 'pdfExtractionQueue',
    bullName: 'pdf-extraction',
    childQueue: true,
  },
  {
    exportName: 'sendEmailQueue',
    bullName: 'send-email',
    bullOpts: {
      // limit to sending 100 emails/hour
      // as supported in free mailgun plan
      limiter: {
        max: 95,
        duration: 60 * 60 * 1000,
      },
    },
  },
  {
    exportName: 'sendWhatsAppQueue',
    bullName: 'send-whatsapp',
    bullOpts: {
      // limit to sending 1 message/ few seconds
      limiter: {
        max: 1,
        duration: 10 * 1000,
      },
    },
  },
  {
    exportName: 'gSheetSyncQueue',
    bullName: 'gsheet-sync',
    // bullOpts: {
    //   limiter: {
    //     max: 20,
    //     duration: 60 * 1000,
    //   },
    // },
  },
];

const exportQueues = {};
queues.forEach(({ exportName, bullName, childQueue, bullOpts = {} }) => {
  exportQueues[exportName] = new Queue(bullName, { ...opts, ...bullOpts });

  // NB: https://stackoverflow.com/a/44446859/721084
  // this line is causing the below warning
  // (node:50280) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 error listeners added. Use emitter.setMaxListeners() to increase limit
  //
  // it's largely okay because we do want to attach complete events on each queue
  exportQueues[exportName].on('completed', (job) => {
    const { id, data: jobData } = job;
    console.log(`[State change] queue:${exportName}:${id}: ✅ Completed!`);
    if (childQueue) {
      redis.sadd(
        `spawnedBy:${jobData.parentJobId}:completed`,
        `${exportName}${id}`,
      );
    }
    job.remove();
  });
});

export default exportQueues;
