import axios from 'axios';
import Sentry from '~/src/sentry';
// import flatten from 'lodash/flatten';

import queues from '../redis-queue';
import { toArray, getRuleDataFromTable } from '~/src/pdf/utils';

async function processJob(jobData) {
  console.log(jobData);
  try {
    const {
      email,
      queueData,
      userProps: { uid, token },
    } = jobData;

    const {
      dataEndpoint,
      rules,
      selectedTableData,
      camelotMethod,
      camelotScale,
      attachmentPassword,
    } = queueData;

    const { attachments, messageId } = email;

    if (!(Array.isArray(attachments) && attachments.length)) {
      // return if no attachments
      return Promise.resolve();
    }

    const { id: attachmentId } = attachments[0];
    const { data: tablesFromAttachment } = await axios.post(
      `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/fetch/tables-from-attachment`,
      {
        uid,
        token,
        messageId,
        attachmentId,
        camelotMethod,
        camelotScale,
        attachmentPassword,
      },
    );

    // select possible tables basis same length of columns in table
    const columnsInSelectedTableData = toArray(selectedTableData[0]).length;
    const possibleTables = tablesFromAttachment.filter(
      (table) => toArray(table[0]).length === columnsInSelectedTableData,
    );

    // [TODO] this is not working for jsonbox
    // jsonbox expects keys to start with alphabets
    // but we have numbers
    // pivot on header can be done
    // but it'll bloat the request/response size considerably
    // and make the endpoint heavy
    // if the endpoint is only to retain a source of truth
    // when posting to excel sheet, then it's okay
    // but if we need to query this endpoint, not sure
    const extractedData = possibleTables
      .map((table) =>
        rules.map((rule, idx) => ({
          [`rule_${idx}`]: getRuleDataFromTable({ data: table, rule }),
        })),
      )
      .reduce((accum, item) => [...accum, ...item], []);

    console.log('extractedData', extractedData);
    if (!extractedData.length) {
      console.log({ selectedTableData });
      console.log({ possibleTables });
    } else {
      await axios.post(dataEndpoint, extractedData);
    }

    return Promise.resolve();
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    return Promise.reject(new Error(e));
  }
}

(() => {
  queues.pdfExtractionQueue.process(5, async (job) => {
    console.log('processing pdfExtractionQueue job#', job.id);
    await processJob(job.data);
  });
})();
