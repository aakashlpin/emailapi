/* eslint-disable consistent-return */
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { fetchEmails, processMessageBody } = require('~/src/gmail');

async function handle(req, res, resolve) {
  const {
    query,
    nextPageToken = '',
    gmail_search_props: gmailSearchProps = {},
    has_attachment: hasAttachment = false,
  } = req.body;

  try {
    const { emails, nextPageToken: resPageToken } = await fetchEmails(
      query,
      req.refresh_token,
      nextPageToken,
      gmailSearchProps,
      hasAttachment,
    );
    const items = emails
      .map((response) => processMessageBody(response.data))
      .filter((item) => item)
      .filter((item) => item.date);

    res.json({ emails: items, nextPageToken: resPageToken });
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    res.status(500).send(e);
  }
  resolve();
}

export default ensureAuth(handle);
