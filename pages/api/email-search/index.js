/* eslint-disable consistent-return */
import ensureAuth from '~/src/middleware/ensureAuth';

const b64Decode = require('base-64').decode;
const { fetchEmails } = require('~/src/gmail');

function getHeaderValueFromEmail(headers = [], name) {
  try {
    return headers.find((header) => header.name === name).value;
  } catch (e) {
    return '';
  }
}

function processEachResponse(message) {
  const {
    id: messageId,
    payload: { body, parts, headers },
  } = message;
  try {
    const getHtmlPart = (partsArr) =>
      Array.isArray(partsArr) && partsArr.length
        ? partsArr.find((part) => part.mimeType === 'text/html')
        : null;

    let htmlPart = getHtmlPart(parts);
    if (
      !htmlPart &&
      Array.isArray(parts) &&
      parts.length &&
      parts[0].parts &&
      getHtmlPart(parts[0].parts[0].parts)
    ) {
      htmlPart = getHtmlPart(parts[0].parts[0].parts);
    }
    const isHtmlContent = !!htmlPart;
    const bodyData = htmlPart ? htmlPart.body.data : body.data;

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
      parts &&
      parts.find(
        (part) =>
          part.mimeType === 'application/pdf' ||
          part.mimeType === 'application/octet-stream',
      );

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
    console.log('here');
    console.log(e);
    return null;
  }
}

async function handle(req, res, resolve) {
  const {
    query,
    nextPageToken = '',
    gmail_search_props: gmailSearchProps = {},
  } = req.body;
  try {
    try {
      const { emails, nextPageToken: resPageToken } = await fetchEmails(
        query,
        req.refresh_token,
        nextPageToken,
        gmailSearchProps,
      );
      const items = emails
        .map((response) => processEachResponse(response.data))
        .filter((item) => item)
        .filter((item) => item.date);

      res.json({ emails: items, nextPageToken: resPageToken });
      return resolve();
    } catch (e) {
      console.log(e);
      res.status(500).send(e);
      return resolve();
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'unauthorized' });
    resolve();
  }
}

export default ensureAuth(handle);
