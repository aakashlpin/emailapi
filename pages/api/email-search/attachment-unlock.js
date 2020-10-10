import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

const base64 = require('base64topdf');
const removePdfPassword = require('remove-pdf-password');

const { fetchEmailByMessageId, processMessageBody } = require('~/src/gmail');
const { getAfterTs } = require('~/src/apps/utils');

require('~/src/queues');

async function handle(req, res, resolve) {
  const {
    attachmentId,
    messageId,
    token,
    uid,
    filename,
    pdfPasswordInput,
  } = req.body;

  try {
    const { data } = await axios.post(
      `${process.env.GOOGLE_OAUTH_REDIRECT_URI}/api/fetch/attachment`,
      {
        messageId,
        attachmentId,
        token,
        uid,
      },
    );

    if (!data.base64) {
      throw new Error(
        'base64 key not found in response object from /api/fetch/attachment',
      );
    }

    try {
      const unixFriendlyFilename = filename.replace(/\s/g, '_');
      const localFilePath = `/tmp/${unixFriendlyFilename}`;
      base64.base64Decode(data.base64, localFilePath);

      const params = {
        inputFilePath: localFilePath,
        password: pdfPasswordInput,
        outputFilePath: `/tmp/${unixFriendlyFilename
          .split('.')
          .map((v, idx) => (idx === 0 ? `${v}_unlocked` : v))
          .join('.')}`,
      };

      removePdfPassword(params);

      const messageBody = await fetchEmailByMessageId({
        messageId,
        refreshToken: req.refresh_token,
      });

      const messageProps = processMessageBody(messageBody);

      const emailOpts = {
        from: `${messageProps.from} <${process.env.NEXT_PUBLIC_SENDING_EMAIL_ID}>`,
        to: req.user.email,
        subject: `[UNLOCKED] ${messageProps.subject}`,
        'h:Reply-To': 'aakash@emailapi.io',
        html: messageProps.message,
        attachment: params.outputFilePath,
      };

      queues.sendEmailQueue.add(emailOpts);

      res.json({
        pollQuery: `from:(${emailOpts.from}) subject:(${
          emailOpts.subject
        }) after:${getAfterTs(new Date())}`,
      });
      return resolve();
    } catch (e) {
      res.status(500).send(e);
      console.log(e);
      return resolve();
    }
  } catch (e) {
    res.status(500).send(e);
    console.log(e);
    return resolve();
  }
}

export default ensureAuth(handle);
