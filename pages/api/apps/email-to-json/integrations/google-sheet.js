import axios from 'axios';
import Sentry from '~/src/sentry';
import ensureAuth from '~/src/middleware/ensureAuth';

import resetSheet from '~/src/integrations/google-spreadsheet/reset-sheet';

const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;

async function handle(req, res, resolve) {
  const {
    uid,
    service_id: serviceId,
    gsheet_id: gSheetId,
    presync_webhook: preSyncWebhook,
  } = req.body;

  if (!gSheetId) {
    res.status(400).json({ error: 'Missing required param `gsheet_id`' });
    resolve();
    return;
  }

  try {
    const { data: existingServiceData } = await axios(
      `${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`,
    );

    await axios.put(`${EMAILAPI_DOMAIN}/${uid}/services/${serviceId}`, {
      ...existingServiceData,
      gsheet_id: gSheetId,
      presync_webhook: preSyncWebhook,
    });

    if (existingServiceData.gsheet_id) {
      // reset existing sheet
      // [NB]: this has a side-effect of data existing on another sheet getting reset
      // if user is changing sheets
      try {
        await resetSheet({
          googleSheetId: existingServiceData.gsheet_id,
        });
      } catch (e) {
        console.log(e);
        Sentry.captureException(e);
      }
    }

    // setup a task per pre-existing data endpoint to sync to gSheet
    const dataEndpoints = existingServiceData.data
      .filter((item) => item.is_successful)
      .map(({ id }) => `${EMAILAPI_DOMAIN}/${uid}/${id}`)
      .map((endpoint) =>
        axios.post(
          `${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/google-spreadsheet`,
          {
            uid,
            refresh_token: req.refresh_token,
            service_id: serviceId,
            data_endpoint: endpoint,
          },
        ),
      );

    await Promise.all(dataEndpoints);
    res.json({});
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    res.status(500).send(e);
  }

  resolve();
}

export default ensureAuth(handle);
