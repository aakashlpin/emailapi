/* eslint-disable consistent-return */
import ensureAuth from '~/src/middleware/ensureAuth';
import { genericErrorHandler } from '~/src/utils';
import { fetchEmails, processMessageBody } from '~/src/gmail';

async function handle(req, res, resolve) {
  const {
    query,
    nextPageToken = '',
    gmail_search_props: gmailSearchProps = {},
    has_attachment: hasAttachment = false,
  } = req.body;

  try {
    const fetchEmailsRes = await fetchEmails(
      query,
      req.refresh_token,
      nextPageToken,
      gmailSearchProps,
      hasAttachment,
    );
    const { emails, nextPageToken: resPageToken } = fetchEmailsRes || {};
    if (Array.isArray(emails) && emails.length) {
      const items = emails
        .map((response) => processMessageBody(response.data))
        .filter((item) => item)
        .filter((item) => item.date);

      res.json({ emails: items, nextPageToken: resPageToken });
    } else {
      res.json({ emails: [] });
    }
  } catch (e) {
    genericErrorHandler(e);
    res.status(500).json({});
  }
  resolve();
}

export default ensureAuth(handle);
