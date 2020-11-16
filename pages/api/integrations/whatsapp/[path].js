// import axios from 'axios';
// import { genericErrorHandler } from '~/src/utils';
import queues from '~/src/redis-queue';

require('~/src/queues');

const { WA_SELF_NUMBER, INLOOPWITH_API_KEY } = process.env;

export default async function handle(req, res) {
  const API_KEY = req.headers['x-ilw-api-key'];
  if (INLOOPWITH_API_KEY !== API_KEY) {
    return res.status(401).send('Unauthorized');
  }

  const { path } = req.query;

  const supportedPaths = ['sendText', 'sendLinkWithAutoPreview'];

  if (!supportedPaths.includes(path)) {
    return res.status(400).json({ error: `route not supported` });
  }

  const { body } = req.body;
  if (!(typeof body === 'string' && body.length)) {
    return res.status(400).json({ error: `missing body` });
  }

  queues.sendWhatsAppQueue.add({
    path: `/${path}`,
    args: [WA_SELF_NUMBER, body],
  });

  return res.json({});
}
