/**
 * this endpoint receives recurring calls from an external source
 * with just 1 mandatory params - `uid`
 *
 * with uid we can create endpoints required to run cron jobs

 * endpoint for user's db object
 *    `${process.env.EMAILAPI_BASE_URL}/users/${uid}`
 *    -> response contains `hostedOptin` boolean
 *
 *    if hostedOptin is false or not set and more than 48 hours have elapsed since `_createdOn`
 *    then delete record at `${process.env.EMAILAPI_BASE_URL}/users/${uid}`
 *
 */
import Sentry from '~/src/sentry';

const base64 = require('base-64');
const axios = require('axios');
const differenceInMinutes = require('date-fns/differenceInMinutes');

export default async function handle(req, res) {
  const authHeader = req.headers.authorization;
  const encodedUsernamePassword = authHeader.replace('Basic', '').trim();
  const decodedUsernamePassword = base64.decode(encodedUsernamePassword);
  const [uid] = decodedUsernamePassword.split(':');

  try {
    await axios(`${process.env.EMAILAPI_BASE_URL}/users/${uid}`);
    // if record is successfully found, then continue

    const response = await axios(
      `${process.env.EMAILAPI_BASE_URL}/users?limit=100`,
    );

    const prs = response.data
      .filter(
        ({ hostedOptin = false, _createdOn }) =>
          !hostedOptin &&
          differenceInMinutes(new Date(), new Date(_createdOn)) >= 48 * 60,
      )
      // eslint-disable-next-line no-shadow
      .map(({ _id }) =>
        axios.delete(`${process.env.EMAILAPI_BASE_URL}/users/${_id}`),
      );

    if (prs.length) {
      await Promise.all(prs);
    }
  } catch (e) {
    // invalid user
    Sentry.captureException(e);
    console.log(e);
  }

  res.json({});
}
