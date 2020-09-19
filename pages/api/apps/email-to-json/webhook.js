import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;
const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;

async function handle(req, res) {
  const { apiId, serviceEndpoint, success, uid } = req.body;
  const { data: serviceData } = await axios(serviceEndpoint);
  const { data = [] } = serviceData;
  const { refresh_token: refreshToken } = req;

  const updatedServiceData = [
    ...data,
    {
      id: apiId,
      is_successful: success,
      _isReadyOn: new Date().toISOString(),
    },
  ];

  await axios.put(serviceEndpoint, {
    ...serviceData,
    data: updatedServiceData,
  });

  // this is where you can sync to other integrations
  // as data in our own store is now persisted

  if (serviceData.gsheet_id && success) {
    console.log('[bg] gsheet_id exists; syncing now');
    try {
      await axios.post(
        `${GOOGLE_OAUTH_REDIRECT_URI}/api/integrations/google-spreadsheet`,
        {
          uid,
          refresh_token: refreshToken,
          service_id: serviceData._id,
          data_endpoint: `${EMAILAPI_DOMAIN}/${uid}/${apiId}`,
        },
      );
    } catch (e) {
      console.log(e);
    }
  }

  res.json({});
}

export default ensureAuth(handle);
