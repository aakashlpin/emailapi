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
  { exportName: 'emailToJsonQueue', bullName: 'email-to-json' },
  { exportName: 'autoUnlockQueue', bullName: 'auto-unlock' },
  { exportName: 'taskStatusQueue', bullName: 'task-status' },
];

const exportQueues = {};
queues.forEach(({ exportName, bullName }) => {
  exportQueues[exportName] = new Queue(bullName, opts);

  exportQueues[exportName].on('completed', (job) => {
    console.log(`Job ${job.id} from ${exportName} completed!`);
    redis.sadd(
      `spawnedBy:${job.data.parentJobId}:completed`,
      `${exportName}${job.id}`,
    );
    job.remove();
  });
});

export default exportQueues;
