import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

async function handle(req, res, resolve) {
  const {
    data_endpoint: dataEndpoint,
    gsheet_id: googleSheetId,
    uid,
    token,
  } = req.body;

  if (!googleSheetId) {
    res.status(500).json({ code: 'gsheet_id is required prop!' });
    return resolve();
  }

  const { user } = req;
  const userProps = {
    uid,
    user,
    token,
    refreshToken: req.refresh_token,
  };

  console.log({ dataEndpoint });

  queues.gSheetSyncQueue.add({
    userProps,
    dataEndpoint,
    googleSheetId,
  });

  res.json({ status: 'ok' });

  return resolve();
}

export default ensureAuth(handle);
