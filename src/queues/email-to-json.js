/* eslint-disable no-shadow */
import axios from 'axios';
import flatten from 'lodash/flatten';
import Sentry from '~/src/sentry';
import { fetchAttachment } from '~/src/gmail';
import extractTableInJson from '~/src/pdf/extract-tables';
import savePdfAttachmentToDisk from '~/src/pdf/create-file';

import applyConfigOnEmail from '../isomorphic/applyConfigOnEmail';
import ensureConfiguration from '../isomorphic/ensureConfiguration';
import queues from '../redis-queue';

const EMAILAPI_DOMAIN = process.env.JSONBOX_NETWORK_URL;
const isLengthyArray = (arr) => Array.isArray(arr) && arr.length;

async function processJob(jobData, done) {
  try {
    const { email, queueData } = jobData;

    const {
      endpoint,
      userProps: { uid, refreshToken },
      serviceEndpoint,
    } = queueData;

    const { data: serviceData } = await axios(serviceEndpoint);
    const { configurations } = serviceData;

    const remoteConfigurations = (
      await Promise.all(
        configurations.map((configId) =>
          axios(`${EMAILAPI_DOMAIN}/${uid}/configurations/${configId}`),
        ),
      )
    ).map((response) => response.data);

    const emailapi = flatten(
      remoteConfigurations.map((config) =>
        [email]
          .map((_email) => ({
            ...applyConfigOnEmail(_email.message, config),
            email_date: _email.date,
          }))
          .filter((extactedData) => ensureConfiguration(extactedData, config)),
      ),
    );

    const {
      extract_table_pdf: extractTablePdf,
      extract_settings: extractSettings = {},
    } = serviceData;

    let extractedTables = null;

    if (
      extractTablePdf &&
      isLengthyArray(email.attachments) &&
      // NB: only supporting single attachment extraction for now
      // 😕 about different password/attachment, different file formats etc
      email.attachments.length === 1
    ) {
      const {
        password: camelotPdfPassword,
        scale: camelotScale,
        method: camelotMethod = 'lattice',
      } = extractSettings;

      const attachmentB64 = await fetchAttachment({
        messageId: email.messageId,
        attachmentId: email.attachments[0].id,
        refreshToken,
      });

      const pdfDiskPath = await savePdfAttachmentToDisk(attachmentB64);
      extractedTables = await extractTableInJson(pdfDiskPath, {
        stream: camelotMethod === 'stream',
        scale: camelotScale,
        password: camelotPdfPassword,
      });

      console.log({ extractedTables });
    }

    // if (!emailapi.length && !extractedTables) {

    // }

    try {
      if (emailapi.length) {
        console.log('[bg] posting data', emailapi);
        await axios.post(endpoint, emailapi);
        if (serviceData.webhook_url) {
          try {
            await axios.post(serviceData.webhook_url, {
              data: emailapi,
              endpoint,
            });
          } catch (e) {
            Sentry.captureException(e);
            console.log(e);
          }
        }
      } else {
        console.log('[bg] no data to post');
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log('error in posting');
      console.log(e);
      const { message } = 'response' in e ? e.response.data : {};
      if (message) {
        await axios.post(endpoint, {
          error: message,
          action:
            "If you believe something's not right, contact help@emailapi.io",
        });
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }

  done();
}

(() => {
  queues.emailToJsonQueue.process(10, (job, done) => {
    console.log('processing emailToJsonQueue job#', job.id);
    processJob(job.data, done);
  });
})();
