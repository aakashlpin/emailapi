import axios from 'axios';
import { Promise } from 'bluebird';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

require('~/src/queues');

const { https } = require('follow-redirects');

const {
  NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: GOOGLE_OAUTH_REDIRECT_URI,
  JSONBOX_NETWORK_URL,
} = process.env;

const dataExists = (data) => Array.isArray(data) && data.length;

// send each page as an SMS
const getPageRecords = async ({ page, dataEndpoint, size = 1 }) =>
  axios(`${dataEndpoint}?limit=${size}&skip=${page * size}`);

const resolveUrl = (url) => {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      console.log(response.responseUrl);
      resolve(response.responseUrl);
    });
    request.end();
  });
};

async function handle(req, res, resolve) {
  const {
    uid,
    token,
    service_id: serviceId,
    data_endpoint: dataEndpoint,
  } = req.body;

  const serviceEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/services/${serviceId}`;
  const { data: serviceData } = await axios(serviceEndpoint);

  const { configurations, wa_phone_number: waPhoneNumber } = serviceData;

  if (configurations.length > 1) {
    res.status(500).json({ code: 'multiple configurations unsupported atm' });
    return resolve();
  }

  const { data: records } = await axios.post(
    `${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/whatsapp/checker`,
    {
      uid,
      token,
      waPhoneNumber,
    },
  );

  if (!records.length) {
    res.status(400).json({ code: 'Whatsapp not configured!' });
    return resolve();
  }

  const [waUserRecord] = records;

  const [configurationId] = configurations;
  const { data: configurationData } = await axios(
    `${JSONBOX_NETWORK_URL}/${uid}/configurations/${configurationId}`,
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

    recordsOnPage
      .map((record) =>
        Object.keys(record)
          .filter(
            (recordKey) =>
              recordKey in fieldKeyToNameMap &&
              !(`${recordKey}_link` in record) &&
              !Array.isArray(record[recordKey]),
          )
          .reduce(
            (accum, recordKey) => ({
              ...accum,
              [recordKey]: record[recordKey],
            }),
            {},
          ),
      )
      .forEach((obj) => {
        const toSendMessage = Object.keys(obj).reduce(
          (accum, item, idx) =>
            `${accum}${idx !== 0 ? '\n' : ''}${fieldKeyToNameMap[item]} — ${
              obj[item]
            }`,
          '',
        );

        queues.sendWhatsAppQueue.add({
          path: '/sendText',
          args: [waUserRecord.from, toSendMessage],
        });
      });

    recordsOnPage
      .map((record) => ({
        record,
        linkKeysInRecord: Object.keys(fieldKeyToNameMap).filter(
          (fieldKey) => `${fieldKey}_link` in record,
        ),
      }))
      .forEach(({ linkKeysInRecord, record }) => {
        console.log({ record, linkKeysInRecord });
        linkKeysInRecord.forEach(async (linkKeyInRecord) =>
          queues.sendWhatsAppQueue.add({
            path: '/sendLinkWithAutoPreview',
            args: [
              waUserRecord.from,
              await resolveUrl(record[`${linkKeyInRecord}_link`]),
              record[linkKeyInRecord],
            ],
          }),
        );
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

  res.json({ status: 'ok' });
  try {
    // kickoff sync
    await syncData();
  } catch (e) {
    console.error(e);
  }

  return resolve();
}

export default ensureAuth(handle);
