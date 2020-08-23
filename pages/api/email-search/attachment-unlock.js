import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

const base64 = require('base64topdf');
const removePdfPassword = require('remove-pdf-password');
const mailgun = require('mailgun-js');
const { fetchEmailByMessageId, processMessageBody } = require('~/src/gmail');

const { MAILGUN_API_KEY } = process.env;
const { MAILGUN_DOMAIN } = process.env;

const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

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
      const localFilePath = `/tmp/${filename}`;
      base64.base64Decode(data.base64, localFilePath);

      const params = {
        inputFilePath: localFilePath,
        password: pdfPasswordInput,
        outputFilePath: `/tmp/${filename
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
        from: `${messageProps.from} <notifications@m.emailapi.io>`,
        to: req.user.email,
        subject: `[UNLOCKED] ${messageProps.subject}`,
        'h:Reply-To': 'aakash@emailapi.io',
        html: messageProps.message,
        attachment: params.outputFilePath,
      };

      mg.messages().send(emailOpts, (error, body) => {
        if (error) {
          console.log('error', error);
          res.status(500).send(error);
          return resolve();
        }
        if (body) {
          console.log('[DONE] attachment-unlock');
          console.log('mailgun res', body);
        }
        res.json({ status: 'ok' });
        return resolve();
      });
    } catch (e) {
      res.status(500).send(e);
      console.log(e);
    }
  } catch (e) {
    res.status(500).send(e);
    console.log(e);
  }
}

export default ensureAuth(handle);
