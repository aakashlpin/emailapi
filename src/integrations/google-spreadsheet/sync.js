import Sentry from '~/src/sentry';

const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function sync({ googleSheetId, sheetHeader, sheetRows }) {
  try {
    const doc = new GoogleSpreadsheet(googleSheetId);

    // use service account creds
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]

    await sheet.setHeaderRow(sheetHeader);
    await sheet.addRows(sheetRows, {
      raw: true,
    });
  } catch (e) {
    Sentry.captureException(e);
    Promise.reject(e);
  }
}
