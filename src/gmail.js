/* eslint-disable no-await-in-loop */
const { google } = require('googleapis');
const format = require('date-fns/format');

const authHandler = require('./auth');
const { log } = require('./integrations/utils');

async function getEmailsFromRemote(gmail, reqParams) {
  const res = await gmail.users.messages.list(reqParams);
  const messageList = res.data.messages;

  if (!messageList) {
    return {
      nextPageToken: null,
      messages: [],
    };
  }

  const remotes = messageList.map((messageListItem) =>
    gmail.users.messages.get({
      userId: reqParams.userId,
      id: messageListItem.id,
    }),
  );

  const messages = await Promise.all(remotes);

  return {
    nextPageToken: res.data.nextPageToken,
    messages,
  };
}

async function fetchEmails(
  query,
  refreshToken,
  pageToken,
  gmailSearchProps = {},
) {
  try {
    const auth = await authHandler(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const reqParams = {
      userId: 'me',
      q: query,
      ...gmailSearchProps, // https://developers.google.com/gmail/api/v1/reference/users/messages/list
    };

    if (pageToken) {
      reqParams.pageToken = pageToken;
    }

    const emailsFromRemote = await getEmailsFromRemote(gmail, reqParams);
    const emails = emailsFromRemote.messages;
    return { emails, nextPageToken: emailsFromRemote.nextPageToken };
  } catch (e) {
    return Promise.reject(new Error(e));
  }
}

const fetchAttachments = async (attachmentParams) => {
  const auth = await authHandler();
  const gmail = google.gmail({ version: 'v1', auth });

  log({ attachments: attachmentParams.length });

  let responses = [];
  const batchSize = 50;
  const maxIter = Math.ceil(attachmentParams.length / batchSize);
  let iter = 0;

  const attachmentParamsCopy = [...attachmentParams];
  while (iter < maxIter) {
    log({ doing: 'fetchAttachments', iter });
    const thisBatch = attachmentParamsCopy.splice(iter * batchSize, batchSize);
    const pdfRemotes = thisBatch.map(({ attachmentId, messageId }) =>
      gmail.users.messages.attachments.get({
        id: attachmentId,
        messageId,
        userId: 'me',
      }),
    );

    const pdfResponses = await Promise.all(pdfRemotes);
    responses = [...responses, ...pdfResponses];
    iter += 1;
  }

  return responses;
};

const attachAfterDatePropToQuery = (q, afterDateInMilliseconds) =>
  `${q} after:${format(new Date(afterDateInMilliseconds), 'MM/dd/yyyy')}`;

module.exports = {
  fetchEmails,
  fetchAttachments,
  attachAfterDatePropToQuery,
};
