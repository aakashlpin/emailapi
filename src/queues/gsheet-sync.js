import axios from 'axios';
// import series from 'async/series';
import { Promise } from 'bluebird';
import queues from '~/src/redis-queue';
import Sentry from '~/src/sentry';

import { toArray } from '~/src/pdf/utils';

const { GoogleSpreadsheet } = require('google-spreadsheet');

const dataExists = (data) => Array.isArray(data) && data.length;

// limit to 10 records at a time because that's the max supported from Airtable
const getPageRecords = async ({
  page,
  dataEndpoint,
  dataToSync = [],
  size = 20,
}) => {
  if (dataEndpoint) {
    const { data } = await axios(
      `${dataEndpoint}?limit=${size}&skip=${page * size}`,
    );
    return data;
  }
  if (!dataToSync) {
    return Promise.resolve(null);
  }
  return Promise.resolve(dataToSync.slice(page * size, size));
};

async function updateSheet({ sheet, sheetHeader, sheetRows }) {
  await sheet.setHeaderRow(sheetHeader);
  await sheet.addRows(sheetRows);
}

async function processJob(job) {
  const { data: jobData } = job;
  const { dataEndpoint, googleSheetId, dataToSync } = jobData;

  if (dataEndpoint && dataToSync) {
    Promise.resolve(
      new Error(
        'both `dataEndpoint` && `dataToSync` cannot be passed to this queue',
      ),
    );
    return;
  }

  const doc = new GoogleSpreadsheet(googleSheetId);

  // use service account creds
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]

  const syncPageToGSheet = async ({ page }) => {
    const recordsOnPage = await getPageRecords({
      dataEndpoint,
      dataToSync,
      page,
    });
    console.log({ page, recordsOnPage });
    if (!dataExists(recordsOnPage)) {
      return false;
    }

    const toSyncData = recordsOnPage
      .map((dataItem) => {
        const ruleKeys = Object.keys(dataItem).filter(
          (key) => key !== '_id' && key !== '_createdOn',
        );
        return ruleKeys.map((ruleKey) => {
          const ruleTableData = dataItem[ruleKey];
          const [header, ...rows] = ruleTableData;
          const cleanHeader = toArray(header).map((item) =>
            item.replace(/\n/gi, ' '),
          );
          return {
            sheetName: ruleKey,
            sheetHeader: cleanHeader,
            sheetRows: rows.map((row) =>
              Object.keys(row).reduce(
                (accum, cellKey) => ({
                  ...accum,
                  [cleanHeader[cellKey]]: row[cellKey],
                }),
                {},
              ),
            ),
          };
        });
      })
      .reduce((accum, item) => [...accum, ...item], []);

    await Promise.mapSeries(toSyncData, async (item, index, arrayLength) => {
      console.log({ item, index, arrayLength });
      const { sheetHeader, sheetRows, sheetName } = item;
      await updateSheet({
        googleSheetId,
        sheet,
        sheetHeader,
        sheetRows,
        sheetName,
      });
    });

    return page + 1;
  };

  const syncData = async (page = 0) => {
    try {
      const nextPage = await syncPageToGSheet({ page });
      if (nextPage) {
        await syncData(nextPage);
      }
    } catch (e) {
      console.log('syncdata with sheet error', e);
      Sentry.captureException(e);
      // further throw for response to forward it
      throw e;
    }
  };

  await syncData();
}

(() => {
  queues.gSheetSyncQueue.process(async (job) => {
    console.log('processing gSheetSyncQueue job#', job.id);
    await processJob(job);
  });
})();
