import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

const EMAILAPI_BASE_URL = process.env.NEXT_PUBLIC_EMAILAPI_BASE_URL;

async function handle(req, res, resolve) {
  const { uid: id } = req.body;
  try {
    await axios.delete(`${EMAILAPI_BASE_URL}/users/${id}`);
    res.json({ yourData: await axios.get(`${EMAILAPI_BASE_URL}/users/${id}`) });
    return resolve();
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
    return resolve();
  }
}

export default ensureAuth(handle);
