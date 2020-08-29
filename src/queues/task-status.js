import axios from 'axios';
import queues, { redis } from '~/src/redis-queue';

function addNotificationsToQueue(notifications) {
  console.log('taskStatusQueue running success notifications...');
  notifications.forEach((notif) => queues.notificationsQueue.add(notif));
}

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
      const { notifyConditions = {} } = completionNotifications.success;

      if (notifyConditions.hasDataAtEndpoint) {
        console.log(
          'taskStatusQueue contains `notifyConditions.hasDataAtEndpoint`',
          notifyConditions.hasDataAtEndpoint,
        );
        const { data = [] } = await axios(notifyConditions.hasDataAtEndpoint);
        if (data.length) {
          addNotificationsToQueue(
            completionNotifications.success.notifications,
          );
        }
      } else if (notifyConditions.childJobsGotCreated) {
        if (completedJobIds.size > 0) {
          addNotificationsToQueue(
            completionNotifications.success.notifications,
          );
        }
      } else {
        console.log('taskStatusQueue contains no notifyConditions');
        addNotificationsToQueue(completionNotifications.success.notifications);
      }
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
