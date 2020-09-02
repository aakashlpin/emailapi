/* eslint-disable consistent-return */
import ensureAuth from '~/src/middleware/ensureAuth';

const { fetchEmails, processMessageBody } = require('~/src/gmail');

async function handle(req, res, resolve) {
  const {
    query,
    nextPageToken = '',
    gmail_search_props: gmailSearchProps = {},
    has_attachment: hasAttachment = false,
    ignore_query: ignoreQuery = '',
  } = req.body;
  try {
    try {
      const { emails, nextPageToken: resPageToken } = await fetchEmails(
        query,
        req.refresh_token,
        nextPageToken,
        gmailSearchProps,
        hasAttachment,
        ignoreQuery,
      );
      const items = emails
        .map((response) => processMessageBody(response.data))
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
