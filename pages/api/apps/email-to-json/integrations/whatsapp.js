import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const { uid, service_id: serviceId, wa_phone_number: phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Missing required param `wa_phone_number`' });
    return resolve();
  }

  try {
    const { data: existingServiceData } = await axios(
      `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`,
    );

    await axios.put(`${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`, {
      ...existingServiceData,
      wa_phone_number: phoneNumber,
    });

    // setup a task per pre-existing data endpoint to sync to gSheet
    const dataEndpoints = existingServiceData.data
      .filter((item) => item.is_successful)
      .map(({ id }) => `${EMAILAPI_DOMAIN}/${uid}/${id}`)
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
