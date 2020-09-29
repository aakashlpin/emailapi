import axios from 'axios';
import queues, { redis } from '~/src/redis-queue';

const isLengthyArray = (arr) => Array.isArray(arr) && arr.length;

function addNotificationsToQueue(notifications) {
  console.log('taskStatusQueue running success notifications...');
  notifications.forEach((notif) => queues.notificationsQueue.add(notif));
}

async function processJob(job) {
  const {
    taskId,
    completionNotifications,
    pendingWebhookNotifications,
  } = job.data;
  const pendingJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:pending`),
  );
  const completedJobIds = new Set(
    await redis.smembers(`spawnedBy:${taskId}:completed`),
  );
  if (pendingJobIds.size === completedJobIds.size) {
    console.log('✅ taskStatusQueue completed! taskId: ', taskId);
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

  // if size is NOT same and pendingWebhookNotifications exist
  if (isLengthyArray(pendingWebhookNotifications)) {
    console.log('⛅️ pendingWebhookNotifications found; syncing to webhook');
    pendingWebhookNotifications.forEach((notificationData) => {
      const { data: webhookPayloadData, ...otherProps } = notificationData;
      const updatedWebhookDataProp = {
        ...otherProps,
        data: {
          ...webhookPayloadData,
          total_jobs: pendingJobIds.size,
          completed_jobs: completedJobIds.size,
          pending_jobs: pendingJobIds.size - completedJobIds.size,
        },
      };

      addNotificationsToQueue({
        type: 'webhook',
        data: updatedWebhookDataProp,
      });
    });

    return Promise.resolve();
  }

  console.log('🔁 taskStatusQueue pending!');
  return Promise.reject(new Error('PENDING!'));
}

(() => {
  queues.taskStatusQueue.process(async (job) => {
    console.log('processing taskStatusQueue job#', job.id);
    await processJob(job);
  });
})();
