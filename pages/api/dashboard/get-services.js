import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

async function handle(req, res, resolve) {
  const { uid } = req.body;
  const userServicesEndpoint = `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/services`;
  const userServicesResponse = await axios(userServicesEndpoint);
  const services = userServicesResponse.data;
  res.json(services);
  return resolve();
}

export default ensureAuth(handle);
