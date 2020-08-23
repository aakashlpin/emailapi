import axios from 'axios';
// import flatten from 'lodash/flatten';

import { autoUnlockQueue } from '../redis-queue';

// const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function processJob(jobData, done) {
  const { emails, queueData } = jobData;
  const {
    unlockPassword,
    userProps: { uid, token },
  } = queueData;

  /**
   * NB:
   * the code below sends 1 unique request per attachment per email
   * ideally assuming that there would be max 1-2 attachments/email
   */
  const unlockRequests = emails
    .reduce((accum, email) => {
      return [
        ...accum,
        ...email.attachments.map((attachment) => ({
          messageId: email.messageId,
          attachmentId: attachment.id,
          filename: attachment.filename,
        })),
      ];
    }, [])
    .map((apiProps) =>
      axios.post(
        `${GOOGLE_OAUTH_REDIRECT_URI}/api/email-search/attachment-unlock`,
        {
          ...apiProps,
          uid,
          token,
          pdfPasswordInput: unlockPassword,
        },
      ),
    );

  await Promise.all(unlockRequests);
  done();
}

(() => {
  autoUnlockQueue.process((job, done) => {
    console.log('processing autoUnlockQueue job#', job._id);
    processJob(job.data, done);
  });
})();
