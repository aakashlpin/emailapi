import axios from 'axios';
import ensureAuth from '~/src/middleware/ensureAuth';

const { WA_DATABASE_URI } = process.env;

async function handle(req, res, resolve) {
  const { waPhoneNumber } = req.body;
  if (!waPhoneNumber) {
    res.status(401).json({ error: 'missing param waPhoneNumber' });
    return resolve();
  }

  try {
    const { data: userFromDb } = await axios(
      // q=name:*ya*
      `${WA_DATABASE_URI}/senders?q=from:*${waPhoneNumber}*`,
    );
    if (userFromDb.length > 1) {
      res.status(500).json({
        error: `DB BOTCHED! Mulitple entries for same phone number. endpoint — "${WA_DATABASE_URI}/senders?q=from:*${waPhoneNumber}"`,
      });
      return resolve();
    }
    if (userFromDb.length === 1) {
      res.json(userFromDb);
      return resolve();
    }
    res.status(200).json([]);
    return resolve();
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
    return resolve();
  }
}

export default ensureAuth(handle);
