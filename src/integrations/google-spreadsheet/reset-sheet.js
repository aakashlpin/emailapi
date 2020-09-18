import Sentry from '~/src/sentry';

const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function resetSheet({ googleSheetId }) {
  try {
    const doc = new GoogleSpreadsheet(googleSheetId);

    // use service account creds
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    // add another sheet
    await doc.addSheet();
    // delete the first one
    const sheet = doc.sheetsByIndex[0];
    await sheet.delete();
  } catch (e) {
    Sentry.captureException(e);
    Promise.reject(e);
  }
}
