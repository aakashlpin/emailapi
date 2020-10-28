import axios from 'axios';
import { Promise } from 'bluebird';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const accountSid = 'AC88a3a4414ad776e6791b1a91f7552c01';
const authToken = 'd7b366385aee3d98cf7425bb73c51ec8';
const client = require('twilio')(accountSid, authToken);

const { EMAILAPI_DOMAIN } = process.env;

const dataExists = (data) => Array.isArray(data) && data.length;

// send each page as an SMS
const getPageRecords = async ({ page, dataEndpoint, size = 1 }) =>
  axios(`${dataEndpoint}?limit=${size}&skip=${page * size}`);

async function handle(req, res, resolve) {
  const { uid, service_id: serviceId, data_endpoint: dataEndpoint } = req.body;

  const serviceEndpoint = `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`;
  const { data: serviceData } = await axios(serviceEndpoint);

  const { configurations, phone_number: phoneNumber } = serviceData;

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

  const sendPageDataInSMS = async ({ page }) => {
    const { data: recordsOnPage } = await getPageRecords({
      dataEndpoint,
      page,
    });
    if (!dataExists(recordsOnPage)) {
      return false;
    }

    const SMSes = recordsOnPage
      .map((record) =>
        Object.keys(record)
          .filter((recordKey) => recordKey in fieldKeyToNameMap)
          .reduce(
            (accum, recordKey) => ({
              ...accum,
              [fieldKeyToNameMap[recordKey]]: record[recordKey],
            }),
            {},
          ),
      )
      .map((obj) =>
        Object.keys(obj).reduce(
          (accum, item, idx) => `${accum}${idx !== 0 ? '\n' : ''}${obj[item]}`,
          '',
        ),
      );

    await Promise.mapSeries(SMSes, async (item) => {
      console.log({ sms: item });
      await client.messages.create({
        from: '+19093651588',
        body: item,
        to: phoneNumber,
      });
    });

    return true;
  };

  const syncData = async (page = 0) => {
    try {
      const success = await sendPageDataInSMS({ page });
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
