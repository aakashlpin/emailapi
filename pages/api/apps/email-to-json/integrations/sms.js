import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

const accountSid = 'AC88a3a4414ad776e6791b1a91f7552c01';
const authToken = 'd7b366385aee3d98cf7425bb73c51ec8';
const client = require('twilio')(accountSid, authToken);

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const {
    uid,
    service_id: serviceId,
    phone_number: phoneNumber,
    phone_verification_code: phoneVerificationCode,
    twilio_sid: twilioSid,
  } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Missing required param `phone_number`' });
    return resolve();
  }

  try {
    const { data: existingServiceData } = await axios(
      `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`,
    );

    await axios.put(`${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`, {
      ...existingServiceData,
      phone_number: phoneNumber,
    });

    if (phoneNumber && !phoneVerificationCode) {
      debugger;
      const twilioRes = await client.verify
        .services('VA736791530f979ed885558a22058b9db4')
        .verifications.create({ to: phoneNumber, channel: 'sms' });
      res.json({ sid: twilioRes.sid });
      return resolve();
    }

    if (phoneNumber && phoneVerificationCode && twilioSid) {
      // [TODO] understand this better and fix it
      const { status: phoneVerificationStatus } = await client.verify
        .services('VA736791530f979ed885558a22058b9db4')
        .verificationChecks.create({
          to: phoneNumber,
          code: phoneVerificationCode,
        });

      if (phoneVerificationStatus !== 'approved') {
        res.json({ verificationStatus: 'failed' });
        return resolve();
      }
    }

    // setup a task per pre-existing data endpoint to sync to gSheet
    const dataEndpoints = existingServiceData.data
      .filter((item) => item.is_successful)
      .map(({ id }) => `${EMAILAPI_DOMAIN}/${uid}/${id}`)
      .map((endpoint) =>
        axios.post(`${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/twilio`, {
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
