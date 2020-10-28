import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const { JSONBOX_NETWORK_URL } = process.env;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const { uid, service_id: serviceId, wa_phone_number: phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Missing required param `wa_phone_number`' });
    return resolve();
  }

  try {
    const serviceEndpoint = `${JSONBOX_NETWORK_URL}/${uid}/services/${serviceId}`;
    const { data: existingServiceData } = await axios(serviceEndpoint);

    await axios.put(`${JSONBOX_NETWORK_URL}/${uid}/services/${serviceId}`, {
      ...existingServiceData,
      wa_phone_number: phoneNumber,
    });

    if (!Array.isArray(existingServiceData.data)) {
      res.json({ error: 'Please wait... data not synced yet!' });
      return resolve();
    }

    // setup a task per pre-existing data endpoint to sync to gSheet
    const dataEndpoints = existingServiceData.data
      .filter((item) => item.is_successful)
      .map(({ id }) => `${JSONBOX_NETWORK_URL}/${uid}/${id}`)
      .map((endpoint) =>
        axios.post(`${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/whatsapp`, {
          uid,
          refresh_token: req.refresh_token,
          service_id: serviceId,
          data_endpoint: endpoint,
        }),
      );

    await Promise.all(dataEndpoints);
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
  }

  res.json({});
  return resolve();
}

export default ensureAuth(handle);
