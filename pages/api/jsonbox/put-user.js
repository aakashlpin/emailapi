import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

const { EMAILAPI_BASE_URL } = process.env;

async function handle(req, res, resolve) {
  const { uid, data } = req.body;
  try {
    await axios.put(`${EMAILAPI_BASE_URL}/users/${uid}`, data);
    res.json({});
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
  return resolve();
}

export default ensureAuth(handle);
