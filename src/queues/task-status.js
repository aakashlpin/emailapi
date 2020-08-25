import queues, { redis } from '~/src/redis-queue';

async function processJob(job) {
  const { taskId, completionNotifications } = job.data;
  const pendingJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:pending`),
  );
  const completedJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:completed`),
  );
  if (pendingJobIds.size === completedJobIds.size) {
    console.log('✅ taskStatusQueue completed!');
    if (completionNotifications.success) {
      console.log('taskStatusQueue running success notifications...');
      completionNotifications.success.forEach((notif) =>
        queues.notificationsQueue.add(notif),
      );
    }
    return Promise.resolve();
  }
  console.log('🔁 taskStatusQueue pending!');
  return Promise.reject(new Error('PENDING!'));
}

(() => {
  queues.taskStatusQueue.process(async (job) => {
    console.log('taskStatusQueue job data', job.data);
    await processJob(job);
  });
})();
