import axios from 'axios';
import queues, { redis } from '~/src/redis-queue';

const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function fetchEmails({
  uid,
  token,
  apiOnly,
  pageToken,
  searchQuery,
  refreshToken,
}) {
  const {
    data: { emails, nextPageToken },
  } = await axios.post(`${GOOGLE_OAUTH_REDIRECT_URI}/api/email-search`, {
    query: searchQuery,
    uid,
    token,
    refresh_token: refreshToken,
    api_only: apiOnly,
    nextPageToken: pageToken,
  });

  return {
    emails,
    nextPageToken,
  };
}

async function iterable({
  pageToken,
  apiOnly,
  userProps,
  searchQuery,
  _nextQueue,
  _nextQueueData,
  parentJobId,
}) {
  const { uid, token, refreshToken } = userProps;
  const { emails, nextPageToken } = await fetchEmails({
    uid,
    token,
    apiOnly,
    pageToken,
    searchQuery,
    refreshToken,
  });

  /**
   * NB: each redis record is pretty BIG
   * as it contains html body of email
   * so the method below is heavy on redis memory
   */
  const prs = emails.map((email) =>
    queues[_nextQueue].add({
      email,
      queueData: _nextQueueData,
      parentJobId,
    }),
  );

  const jobs = await Promise.all(prs);

  console.log('-----mail-fetch new jobs');
  console.log(jobs);
  console.log('-----mail-fetch new jobs');

  redis.sadd(
    `spawnedBy:${parentJobId}:pending`,
    jobs.map((job) => `${_nextQueue}${job.id}`),
  );

  if (nextPageToken) {
    return iterable({
      apiOnly,
      userProps,
      searchQuery,
      _nextQueue,
      _nextQueueData,
      pageToken: nextPageToken,
      parentJobId,
    });
  }

  return null;
}

async function processJob(job, done) {
  const { data: jobData, id } = job;
  const {
    userProps,
    apiOnly,
    searchQuery,
    _nextQueue,
    _nextQueueData,
  } = jobData;

  await iterable({
    userProps,
    apiOnly,
    searchQuery,
    _nextQueue,
    _nextQueueData,
    parentJobId: id,
  });

  queues.taskStatusQueue.add(
    {
      taskId: id,
    },
    {
      attempts: 30,
      backoff: {
        type: 'fixed',
        delay: 30 * 1000,
      },
    },
  );

  done();
}

(() => {
  queues.mailFetchQueue.process((job, done) => {
    console.log('mailFetchQueue job data', job.data);
    processJob(job, done);
  });
})();
