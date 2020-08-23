import axios from 'axios';
import * as queues from '~/src/redis-queue';

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
  queues[_nextQueue].add({
    emails,
    queueData: _nextQueueData,
  });

  if (nextPageToken) {
    return iterable({
      apiOnly,
      userProps,
      searchQuery,
      _nextQueue,
      _nextQueueData,
      pageToken: nextPageToken,
    });
  }

  return null;
}

async function processJob(jobData, done) {
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
  });

  done();
}

(() => {
  queues.mailFetchQueue.process((job, done) => {
    console.log('mailFetchQueue job data', job.data);
    processJob(job.data, done);
  });
})();
