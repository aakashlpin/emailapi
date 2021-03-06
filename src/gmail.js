import { genericErrorHandler } from '~/src/utils';

const { google } = require('googleapis');
const format = require('date-fns/format');
const b64Decode = require('base-64').decode;

const authHandler = require('./auth');

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

export function processMessageBody(message) {
  const {
    id: messageId,
    payload: { body, parts, headers },
  } = message;
  try {
    const htmlPart = findPartOfType(parts, 'text/html');
    const isHtmlContent = !!htmlPart;

    let bodyData = isHtmlContent ? htmlPart.body.data : body.data;
    if (!bodyData) {
      const plainTextPart = findPartOfType(parts, 'text/plain');
      if (!plainTextPart) {
        return null;
      }
      bodyData = plainTextPart.body.data;
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
      findPartOfType(parts, 'application/octet-stream') ||
      findPartOfType(parts, 'binary/octet-stream');

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
    genericErrorHandler(e);
    return null;
  }
}

async function getEmailsFromRemote(gmail, reqParams) {
  try {
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
  } catch (e) {
    genericErrorHandler(e);
    return null;
  }
}

export async function fetchEmailByMessageId({ messageId, refreshToken }) {
  try {
    const auth = await authHandler(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const { data } = await gmail.users.messages.get({
      id: messageId,
      userId: 'me',
    });

    return data;
  } catch (e) {
    genericErrorHandler(e);
    return null;
  }
}

export async function fetchEmails(
  query,
  refreshToken,
  pageToken,
  gmailSearchProps = {},
  hasAttachment = false,
) {
  try {
    const auth = await authHandler(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const reqParams = {
      userId: 'me',
      q: query,
      // keep per page size low
      maxResults: 20,
      ...gmailSearchProps, // https://developers.google.com/gmail/api/v1/reference/users/messages/list
    };

    if (pageToken) {
      reqParams.pageToken = pageToken;
    }

    if (hasAttachment) {
      reqParams.q = `${reqParams.q} has:attachment -from:${process.env.NEXT_PUBLIC_SENDING_EMAIL_ID}`;
    }

    const emailsFromRemote = await getEmailsFromRemote(gmail, reqParams);
    const { messages: emails, nextPageToken } = emailsFromRemote;
    return { emails, nextPageToken };
  } catch (e) {
    genericErrorHandler(e);
    return null;
  }
}

export const fetchAttachment = async ({
  attachmentId,
  messageId,
  refreshToken,
}) => {
  try {
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
  } catch (e) {
    genericErrorHandler(e);
    return null;
  }
};

export const fetchAttachments = async (attachmentParams) => {
  try {
    const auth = await authHandler();
    const gmail = google.gmail({ version: 'v1', auth });

    let responses = [];
    const batchSize = 50;
    const maxIter = Math.ceil(attachmentParams.length / batchSize);
    let iter = 0;

    const attachmentParamsCopy = [...attachmentParams];
    while (iter < maxIter) {
      const thisBatch = attachmentParamsCopy.splice(
        iter * batchSize,
        batchSize,
      );
      const pdfRemotes = thisBatch.map(({ attachmentId, messageId }) =>
        gmail.users.messages.attachments.get({
          id: attachmentId,
          messageId,
          userId: 'me',
        }),
      );

      // eslint-disable-next-line no-await-in-loop
      const pdfResponses = await Promise.all(pdfRemotes);
      responses = [...responses, ...pdfResponses];
      iter += 1;
    }

    return responses;
  } catch (e) {
    genericErrorHandler(e);
    return null;
  }
};

export const attachAfterDatePropToQuery = (q, afterDateInMilliseconds) =>
  `${q} after:${format(new Date(afterDateInMilliseconds), 'MM/dd/yyyy')}`;
