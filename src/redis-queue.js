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
  {
    exportName: 'emailToJsonQueue',
    bullName: 'email-to-json',
    childQueue: true,
  },
  { exportName: 'autoUnlockQueue', bullName: 'auto-unlock', childQueue: true },
];

const exportQueues = {};
queues.forEach(({ exportName, bullName, childQueue }) => {
  exportQueues[exportName] = new Queue(bullName, opts);

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
