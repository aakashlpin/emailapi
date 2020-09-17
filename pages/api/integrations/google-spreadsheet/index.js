import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { GoogleSpreadsheet } = require('google-spreadsheet');

async function handle(req, res, resolve) {
  try {
    const {
      gsheet_id: googleSheetId,
      sheet_header: sheetHeader,
      sheet_rows: sheetRows,
    } = req.body;

    const doc = new GoogleSpreadsheet(googleSheetId);

    // use service account creds
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
    console.log(sheet.title);
    console.log(sheet.rowCount);

    await sheet.setHeaderRow(sheetHeader);
    await sheet.addRows(sheetRows);

    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).send(e);
    Sentry.captureException(e);
  }

  return resolve();
}

export default ensureAuth(handle);
