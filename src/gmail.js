/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */
const { google } = require('googleapis');
const format = require('date-fns/format');
const b64Decode = require('base-64').decode;

const authHandler = require('./auth');
const { log } = require('./integrations/utils');

function getHeaderValueFromEmail(headers = [], name) {
  try {
    return headers.find((header) => header.name === name).value;
  } catch (e) {
    return '';
  }
}

const isLengthyArray = (arr) => Array.isArray(arr) && arr.length;

function findPartOfType(parts, type) {
  if (!isLengthyArray(parts)) {
    return null;
  }

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < parts.length; i++) {
    const childHtmlPart = parts.find((part) => part.mimeType === type);
    if (childHtmlPart) {
      return childHtmlPart;
    }
    if (isLengthyArray(parts[i].parts)) {
      const grandChildHtmlPart = findPartOfType(parts[i].parts, type);
      if (grandChildHtmlPart) {
        return grandChildHtmlPart;
      }
    }
  }

  return null;
}

function processMessageBody(message) {
  const {
    id: messageId,
    payload: { body, parts, headers },
  } = message;
  try {
    const htmlPart = findPartOfType(parts, 'text/html');
    const isHtmlContent = !!htmlPart;

    const bodyData = isHtmlContent ? htmlPart.body.data : body.data;
    if (!bodyData) {
      return null;
    }
    const messageBody = decodeURIComponent(
      escape(b64Decode(bodyData.replace(/-/g, '+').replace(/_/g, '/'))),
    );
    const subject = getHeaderValueFromEmail(headers, 'Subject');
    const date = getHeaderValueFromEmail(headers, 'Date');
    const from = getHeaderValueFromEmail(headers, 'From');

    const parsedData = {
      messageId,
      message: messageBody,
      subject,
      date,
      from,
      isHtmlContent,
    };

    const pdfProps =
      findPartOfType(parts, 'application/pdf') ||
      findPartOfType(parts, 'application/octet-stream');

    if (pdfProps) {
      const {
        filename,
        body: { attachmentId },
      } = pdfProps;

      parsedData.attachments = [
        {
          id: attachmentId,
          filename,
        },
      ];
    }

    return parsedData;
  } catch (e) {
    console.log(e);
    return null;
  }
}

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

async function fetchEmailByMessageId({ messageId, refreshToken }) {
  const auth = await authHandler(refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const { data } = await gmail.users.messages.get({
    id: messageId,
    userId: 'me',
  });

  return data;
}

async function fetchEmails(
  query,
  refreshToken,
  pageToken,
  gmailSearchProps = {},
  hasAttachment = false,
  ignoreQuery = '',
) {
  try {
    const auth = await authHandler(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const reqParams = {
      userId: 'me',
      q: query,
      // keep per page size low
      maxResults: 10,
      ...gmailSearchProps, // https://developers.google.com/gmail/api/v1/reference/users/messages/list
    };

    if (pageToken) {
      reqParams.pageToken = pageToken;
    }

    if (hasAttachment) {
      reqParams.q = `${reqParams.q} has:attachment`;
    }

    if (ignoreQuery) {
      reqParams.q = `${reqParams.q} -${ignoreQuery}`;
    }

    const emailsFromRemote = await getEmailsFromRemote(gmail, reqParams);
    const emails = emailsFromRemote.messages;
    return { emails, nextPageToken: emailsFromRemote.nextPageToken };
  } catch (e) {
    return Promise.reject(new Error(e));
  }
}

const fetchAttachment = async ({ attachmentId, messageId, refreshToken }) => {
  const auth = await authHandler(refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const pdfRemoteResponse = await gmail.users.messages.attachments.get({
    id: attachmentId,
    messageId,
    userId: 'me',
  });

  const { data } = pdfRemoteResponse;
  if (data.size) {
    // decode data.data
    // and store in a attachment
    return data.data.replace(/-/g, '+').replace(/_/g, '/');
  }

  return pdfRemoteResponse;
};

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
  fetchEmailByMessageId,
  fetchAttachment,
  fetchAttachments,
  attachAfterDatePropToQuery,
  processMessageBody,
};
