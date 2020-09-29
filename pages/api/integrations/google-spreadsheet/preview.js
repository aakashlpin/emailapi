import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';
import gSheetSync from '~/src/integrations/google-spreadsheet/sync';
import { toArray } from '~/src/pdf/utils';

const { GoogleSpreadsheet } = require('google-spreadsheet');

const dataExists = (data) => Array.isArray(data) && data.length;

// limit to 10 records at a time because that's the max supported from Airtable
const getPageRecords = async ({ page, dataEndpoint, size = 20 }) =>
  axios(`${dataEndpoint}?limit=${size}&skip=${page * size}`);

// function sleep(ms) {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve();
//     }, ms);
//   });
// }

async function updateSheet({ sheet, sheetHeader, sheetRows }) {
  await sheet.setHeaderRow(sheetHeader);
  await sheet.addRows(sheetRows);
}

async function handle(req, res, resolve) {
  const { data_endpoint: dataEndpoint, gsheet_id: googleSheetId } = req.body;
  console.log(req.body);

  if (!googleSheetId) {
    res.status(500).json({ code: 'gsheet_id is required prop!' });
    return resolve();
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
    const { data: recordsOnPage } = await getPageRecords({
      dataEndpoint,
      page,
    });
    console.log({ recordsOnPage });
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

    const prs = toSyncData.map(({ sheetHeader, sheetRows, sheetName }) =>
      updateSheet({
        googleSheetId,
        sheet,
        sheetHeader,
        sheetRows,
        sheetName,
      }),
    );

    await Promise.all(prs);

    return true;
  };

  const syncData = async (page = 0) => {
    try {
      const success = await syncPageToGSheet({ page });
      if (success) {
        await syncData(page + 1);
      }
    } catch (e) {
      console.log('syncdata with sheet error', e);
      Sentry.captureException(e);
      // further throw for response to forward it
      throw e;
    }
  };

  try {
    // kickoff sync
    await syncData();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).send(e);
  }

  return resolve();
}

export default ensureAuth(handle);
