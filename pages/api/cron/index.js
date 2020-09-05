/**
 * this endpoint receives recurring calls from an external source
 * with just 1 mandatory params - `uid`
 *
 * with uid we can create endpoints required to run cron jobs

 * 1. endpoint for user's db object
 *    `${process.env.EMAILAPI_BASE_URL}/users/${uid}`
 *    -> response contains `refreshToken` necessary to query gmail api
 *
 * 2. endpoint for user's services array
 *    `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/services`
 *    -> response contains array of objects with `{cron: true/false}` to identify services to run with cron
 */

const base64 = require('base-64');
const axios = require('axios');

export default async function handle(req, res) {
  const authHeader = req.headers.authorization;
  const encodedUsernamePassword = authHeader.replace('Basic', '').trim();
  const decodedUsernamePassword = base64.decode(encodedUsernamePassword);
  const [uid] = decodedUsernamePassword.split(':');

  try {
    // if valid user initiated request, then continue
    await axios(`${process.env.EMAILAPI_BASE_URL}/users/${uid}`);

    const { data: users } = await axios(
      `${process.env.EMAILAPI_BASE_URL}/users?limit=100`,
    );

    const userCrons = users.map(({ refreshToken, _id }) =>
      axios.post(
        `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/cron/user-cron`,
        {
          refresh_token: refreshToken,
          uid: _id,
        },
      ),
    );

    Promise.all(userCrons);
  } catch (e) {
    console.log(e);
  }
  res.json({});
}
