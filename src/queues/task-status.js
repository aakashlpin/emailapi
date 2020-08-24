import queues, { redis } from '~/src/redis-queue';

async function processJob(job, done) {
  const { taskId } = job.data;
  const pendingJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:pending`),
  );
  const completedJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:completed`),
  );
  if (pendingJobIds.size === completedJobIds.size) {
    console.log('✅ taskStatusQueue completed!');
    return done();
  }
  console.log('🔁 taskStatusQueue pending!');
  return done(new Error('PENDING!'));
}

(() => {
  queues.taskStatusQueue.process((job, done) => {
    console.log('taskStatusQueue job data', job.data);
    processJob(job, done);
  });
})();
