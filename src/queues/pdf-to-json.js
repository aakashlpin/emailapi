import axios from 'axios';
import Sentry from '~/src/sentry';
// import flatten from 'lodash/flatten';

import queues from '../redis-queue';
import { toArray, getRuleDataFromTable } from '~/src/pdf/utils';

const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function processJob(jobData) {
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
      `${GOOGLE_OAUTH_REDIRECT_URI}/api/fetch/tables-from-attachment`,
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

    const extractedData = possibleTables
      .map((table) =>
        rules
          .map((rule, idx) => {
            // [TODO] this will need to be processed as per rule type
            const ruleData = getRuleDataFromTable({ data: table, rule });
            if (ruleData) {
              return {
                [`rule_${idx}`]: ruleData.rows,
              };
            }
            return null;
          })
          .filter((item) => item),
      )
      .reduce((accum, item) => [...accum, ...item], []);

    if (!extractedData.length) {
      // console.log({ selectedTableData });
      // console.log({ possibleTables });
    } else {
      console.log({ extractedData });
      try {
        // NB: this is additive in nature
        // so you can't keep syncing data against this endpoint
        // over and over again for each iteration
        await axios.post(dataEndpoint, extractedData);
        rules.forEach((rule, idx) => {
          const googleSheetId = rule.remoteSync?.googleSheet?.id;
          const extractedDataForRule = extractedData.find(
            (data) => data[`rule_${idx}`],
          );
          if (googleSheetId && extractedDataForRule) {
            queues.gSheetSyncQueue.add({
              googleSheetId,
              dataToSync: [extractedDataForRule],
            });
          }
        });
      } catch (e) {
        console.error(e);
      }
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

// equity 1DGJ48YOtEX1KDoUE0ifL0_Wub2znlDiNHtB7wWLrI4Q
// fno 1bKG6zbfGltkPCfqwtdk0Uix-MMAw-fnerRechkFCmyQ
