import axios from 'axios';
import Airtable from 'airtable';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { EMAILAPI_DOMAIN, AIRTABLE_APIKEY } = process.env;

const dataExists = (data) => Array.isArray(data) && data.length;

async function handle(req, res, resolve) {
  const {
    uid,
    airtable_base_id: airtableBaseId,
    airtable_table_name: airtableTableName,
    service_id: serviceId,
    data_endpoint: dataEndpoint,
  } = req.body;

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;
  console.log({ serviceEndpoint });
  const { data: serviceData } = await axios(serviceEndpoint);

  const { webhook_url: webhookUrl, configurations } = serviceData;
  // if (!webhookUrl) {
  //   res.status(500).json({ code: 'webhook_url not found in service data ' });
  //   return resolve();
  // }

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

  const fieldKeyToNameMap = fields.reduce(
    (accum, field) => ({
      ...accum,
      [field.fieldKey]: field.fieldName,
    }),
    {},
  );

  const base = new Airtable({ apiKey: AIRTABLE_APIKEY }).base(airtableBaseId);

  // limit to 10 records at a time because that's the max supported from Airtable
  const getPageRecords = async ({ page }) =>
    axios(`${dataEndpoint}?limit=10&skip=${page * 10}`);

  const syncPageToAirtable = async ({ page }) => {
    const { data: recordsOnPage } = await getPageRecords({ page });
    if (!dataExists(recordsOnPage)) {
      return false;
    }

    const airtableFields = recordsOnPage.map((record) => ({
      fields: Object.keys(record)
        .filter((recordKey) => recordKey in fieldKeyToNameMap)
        .reduce(
          (accum, recordKey) => ({
            ...accum,
            [fieldKeyToNameMap[recordKey]]: record[recordKey],
          }),
          {},
        ),
    }));

    try {
      await base(airtableTableName).create(airtableFields);
    } catch (e) {
      console.log('airtable api error', e);
      Sentry.captureException(e);
    }

    return true;
  };

  const syncData = async (page = 0) => {
    try {
      const success = await syncPageToAirtable({ page });
      if (success) {
        await syncData(page + 1);
      }
    } catch (e) {
      console.log('syncdata with airtable error', e);
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
