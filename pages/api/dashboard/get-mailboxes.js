import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

async function handle(req, res, resolve) {
  const { uid } = req.body;
  const userServicesEndpoint = `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/mailbox`;
  console.log({ userServicesEndpoint });
  try {
    const userServicesResponse = await axios(userServicesEndpoint);
    const services = userServicesResponse.data;
    console.log(services);
    res.json(services);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
  return resolve();
}

export default ensureAuth(handle);
