import axios from 'axios';

const { WA_DATABASE_URI } = process.env;

export default async function handle(req, res) {
  const { event, data } = req.body;
  if (event !== 'message') {
    return res.json({});
  }

  const { from, sender, body } = data;
  try {
    const { data: userFromDb } = await axios(
      `${WA_DATABASE_URI}/senders?q=from:${from}`,
    );
    if (userFromDb.length) {
      console.log(`existing user whatsapp request from ${from} — "${body}"`);
      return res.json({});
    }
    await axios.post(`${WA_DATABASE_URI}/senders`, {
      from,
      sender,
    });
    console.log(
      `successfully synced new whatsapp request from ${from} — "${body}"`,
    );
    return res.json({});
  } catch (e) {
    console.log(e);
    return res.status(500).send(e);
  }
}
