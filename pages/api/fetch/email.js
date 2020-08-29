import ensureAuth from '~/src/middleware/ensureAuth';

const { fetchEmailByMessageId } = require('~/src/gmail');

async function handle(req, res, resolve) {
  const { messageId } = req.body;

  const messageBody = await fetchEmailByMessageId({
    messageId,
    refreshToken: req.refresh_token,
  });

  res.json(messageBody);
  resolve();
}

export default ensureAuth(handle);
