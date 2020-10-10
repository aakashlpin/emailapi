import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

async function handle(req, res, resolve) {
  const { uid } = req.body;
  // [TODO] paginate this API
  const userServicesEndpoint = `${process.env.JSONBOX_NETWORK_URL}/${uid}/services?limit=100`;
  const userServicesResponse = await axios(userServicesEndpoint);
  const services = userServicesResponse.data;
  res.json(services);
  return resolve();
}

export default ensureAuth(handle);
