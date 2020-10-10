/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { fetchEmails, processMessageBody } = require('~/src/gmail');

async function iterable({
  query,
  refreshToken,
  nextPageToken,
  gmailSearchProps,
}) {
  const { emails, nextPageToken: resPageToken } = await fetchEmails(
    query,
    refreshToken,
    nextPageToken,
    gmailSearchProps,
  );

  const items = emails
    .map((response) => processMessageBody(response.data))
    .filter((item) => item)
    .filter((item) => item.date);

  const bySender = items.reduce(
    (accum, item) => ({
      ...accum,
      [item.from]: Array.isArray(accum[item.from])
        ? [...accum[item.from], item.subject]
        : [item.subject],
    }),
    {},
  );

  return {
    data: bySender,
    nextPageToken: resPageToken,
  };
}

function attachData(store, data) {
  Object.keys(data).forEach((emailFrom) => {
    if (Array.isArray(store[emailFrom])) {
      store[emailFrom] = [...store[emailFrom], ...data[emailFrom]];
    } else {
      store[emailFrom] = data[emailFrom];
    }
  });
}

async function perform({
  query,
  refreshToken,
  token,
  store,
  maxPages = 10,
  currentPage = 1,
}) {
  const { data: nextData, nextPageToken } = await iterable({
    query,
    refreshToken,
    nextPageToken: token,
    gmailSearchProps: {
      maxResults: 100,
    },
  });
  attachData(store, nextData);

  if (currentPage >= maxPages) {
    return;
  }

  if (nextPageToken) {
    await perform({
      query,
      refreshToken,
      token: nextPageToken,
      store,
      currentPage: currentPage + 1,
    });
  }
}

async function handle(req, res, resolve) {
  const { max_pages: maxPages = 10 } = req.body;
  const query = ``;
  const dataHolder = {};
  const refreshToken = req.refresh_token;
  try {
    await perform({
      query,
      refreshToken,
      store: dataHolder,
      maxPages,
    });

    res.json({ store: dataHolder });
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    res.status(500).send(e);
  }
  resolve();
}

export default ensureAuth(handle);
