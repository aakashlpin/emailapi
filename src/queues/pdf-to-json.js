import axios from 'axios';
import { Promise } from 'bluebird';
import Sentry from '~/src/sentry';

import queues from '../redis-queue';
import { toArray, getRuleDataFromTable, getRuleKey } from '~/src/pdf/utils';
import { RULE_TYPE } from '../pdf/enums';

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
      postProcessingEndpoint,
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
    const { data: attachmentTables } = await axios.post(
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

    const rulesAppliedJson = rules
      .map((rule) => {
        const { selectedTableData, selectedTableId } = rule;
        switch (rule.type) {
          case RULE_TYPE.INCLUDE_ROWS: {
            // select possible tables basis same length of columns in table
            const colsInReferenceTable = toArray(selectedTableData[0]).length;
            const possibleTables = attachmentTables.filter(
              (table) => toArray(table[0]).length === colsInReferenceTable,
            );

            // doing a .map instead of .filter ensures the following use case:
            // if pdf contains repeating table structures with similar columns
            const extractedData = possibleTables
              .map((table) => getRuleDataFromTable({ data: table, rule })?.rows)
              .filter((i) => i)
              .reduce((accum, item) => [...accum, ...item], []);

            if (!extractedData.length) {
              return null;
            }

            return {
              rule,
              data: { [getRuleKey(rule)]: extractedData },
            };
          }
          case RULE_TYPE.INCLUDE_CELLS: {
            const extractedTable = attachmentTables[selectedTableId];
            const colsInReferenceTable = toArray(selectedTableData[0]).length;
            const colsInExtractedTable = toArray(extractedTable[0]).length;
            if (colsInReferenceTable !== colsInExtractedTable) {
              debugger;
              console.log('incorrect mapping in RULE_TYPE.INCLUDE_CELLS');
              Sentry.captureException(
                'incorrect mapping in RULE_TYPE.INCLUDE_CELLS',
              );
              return null;
            }

            const { cells } = rule;
            const extractedCells = cells
              .map((cell) => {
                const { key, rowIdx, colIdx } = cell;
                try {
                  const extractedCellValue = extractedTable[rowIdx][colIdx];
                  return {
                    [key]: extractedCellValue,
                  };
                } catch (e) {
                  console.log('error in extracting cell value at location');
                  Sentry.captureException(e);
                  return null;
                }
              })
              .filter((item) => item)
              .reduce(
                (accum, item) => ({
                  ...accum,
                  ...item,
                }),
                {},
              );

            if (toArray(extractedCells).length) {
              return {
                rule,
                data: { [getRuleKey(rule)]: extractedCells },
              };
            }
            return null;
          }
          default: {
            return null;
          }
        }
      })
      .filter((i) => i);

    let processedData = rulesAppliedJson;
    if (postProcessingEndpoint) {
      try {
        const { data } = await axios.post(
          postProcessingEndpoint,
          rulesAppliedJson,
        );
        processedData = data;
      } catch (e) {
        console.log('postProcessingEndpoint failed', e);
        Sentry.captureException(e);
      }
    }

    const toSyncWithRemoteEndpoint = processedData.reduce(
      (remoteSyncData, item) => {
        const { data } = item;
        return {
          ...remoteSyncData,
          ...data,
        };
      },
      {},
    );

    try {
      await axios.post(dataEndpoint, toSyncWithRemoteEndpoint);
    } catch (e) {
      Sentry.captureException(e);
    }

    processedData.forEach((item) => {
      const { rule, data } = item;
      const googleSheetId = rule.remoteSync?.googleSheet?.id;
      if (googleSheetId) {
        queues.gSheetSyncQueue.add({
          googleSheetId,
          dataToSync: [data],
        });
      }
    });

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
