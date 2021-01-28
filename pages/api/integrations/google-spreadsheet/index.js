import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';
import gSheetSync from '~/src/integrations/google-spreadsheet/sync';

const { NEXT_PUBLIC_EMAILAPI_DOMAIN: EMAILAPI_DOMAIN } = process.env;

const dataExists = (data) => Array.isArray(data) && data.length;

// limit to 10 records at a time because that's the max supported from Airtable
const getPageRecords = async ({ page, dataEndpoint, size = 20 }) =>
  axios(`${dataEndpoint}?limit=${size}&skip=${page * size}`);

async function handle(req, res, resolve) {
  const { uid, service_id: serviceId, data_endpoint: dataEndpoint } = req.body;

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;
  console.log({ serviceEndpoint });
  const { data: serviceData } = await axios(serviceEndpoint);

  const {
    configurations,
    gsheet_id: googleSheetId,
    presync_webhook: preSyncWebhook,
  } = serviceData;

  if (!googleSheetId) {
    res.status(500).json({ code: 'gsheet_id not found in service data ' });
    return resolve();
  }

  console.log({ serviceData });
  if (configurations.length > 1) {
    res.status(500).json({ code: 'multiple configurations unsupported atm' });
    return resolve();
  }

  const [configurationId] = configurations;
  const { data: configurationData } = await axios(
    `${EMAILAPI_DOMAIN}/${uid}/configurations/${configurationId}`,
  );

  const { fields = [] } = configurationData;

  if (!fields.length) {
    res.status(500).json({ code: 'no fields found in configuration' });
    return resolve();
  }

  fields.push({
    fieldKey: 'email_date',
    fieldName: 'Email Date',
  });

  const fieldKeyToNameMap = fields.reduce(
    (accum, field) => ({
      ...accum,
      [field.fieldKey]: field.fieldName,
    }),
    {},
  );

  const syncPageToGSheet = async ({ page }) => {
    const { data: recordsOnPage } = await getPageRecords({
      dataEndpoint,
      page,
    });
    if (!dataExists(recordsOnPage)) {
      return false;
    }

    const sheetHeader = fields.map((field) => field.fieldName);

    const sheetRows = recordsOnPage.map((record) =>
      Object.keys(record)
        .filter((recordKey) => recordKey in fieldKeyToNameMap)
        .reduce(
          (accum, recordKey) => ({
            ...accum,
            [fieldKeyToNameMap[recordKey]]: record[recordKey],
          }),
          {},
        ),
    );

    if (!preSyncWebhook) {
      console.log('👎 preSyncWebhook');
      try {
        await gSheetSync({
          googleSheetId,
          sheetHeader,
          sheetRows,
        });
      } catch (e) {
        console.log('error with gSheetSync without preSyncWebhook', e);
        Sentry.captureException(e);
      }
    } else {
      console.log('👍 preSyncWebhook');
      try {
        const {
          data: { header: customSheetHeader, rows: customSheetRows },
        } = await axios.post(preSyncWebhook, {
          header: sheetHeader,
          rows: sheetRows,
        });

        await gSheetSync({
          googleSheetId,
          sheetHeader: customSheetHeader,
          sheetRows: customSheetRows,
        });
      } catch (e) {
        console.log('error with gSheetSync or preSyncWebhook', e);
        Sentry.captureException(e);
      }
    }

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
