import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { EMAILAPI_DOMAIN, GOOGLE_OAUTH_REDIRECT_URI } = process.env;

const dataExists = (data) => Array.isArray(data) && data.length;

// limit to 10 records at a time because that's the max supported from Airtable
const getPageRecords = async ({ page, dataEndpoint }) =>
  axios(`${dataEndpoint}?limit=10&skip=${page * 10}`);

async function handle(req, res, resolve) {
  const {
    uid,
    service_id: serviceId,
    data_endpoint: dataEndpoint,
    resync_data: reSyncData,
  } = req.body;

  if (reSyncData && dataEndpoint) {
    // reSyncData will clean the sheet and resync data from all existing data endpoints
    res.status(400).json({
      error: 'resync_data and data_endpoint both cannot be supplied together',
    });
  }

  // [TODO] implement resync_data

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;
  console.log({ serviceEndpoint });
  const { data: serviceData } = await axios(serviceEndpoint);

  const { configurations, gsheet_id: googleSheetId } = serviceData;
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

    try {
      await axios.post(
        `${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/google-spreadsheet`,
        {
          uid,
          refresh_token: req.refreshToken,
          gsheet_id: googleSheetId,
          sheet_header: [
            'Total Amount Due',
            'Min Amount Due',
            'Due Date',
            'Email Date',
          ],
          sheet_rows: sheetRows,
        },
      );
    } catch (e) {
      console.log('google-spreadsheet integration api error', e);
      Sentry.captureException(e);
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
