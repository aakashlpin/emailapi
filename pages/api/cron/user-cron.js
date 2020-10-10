import Sentry from '~/src/sentry';

const axios = require('axios');

export default async function handle(req, res) {
  const { refresh_token: refreshToken, uid } = req.body;
  try {
    // NB: only processes 100 services
    const { data: userServices } = await axios(
      `${process.env.JSONBOX_NETWORK_URL}/${uid}/services?limit=100`,
    );

    res.json({});

    const prs = userServices
      .filter((service) => service.cron)
      .map(async (service) => {
        switch (service.app) {
          case 'EMAIL_TO_JSON': {
            return axios.post(
              `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/apps/email-to-json`,
              {
                uid,
                refresh_token: refreshToken,
                new_only: true,
                service_id: service._id,
                cron: true,
              },
            );
          }
          case 'AUTO_UNLOCK': {
            return axios.post(
              `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/apps/auto-unlock`,
              {
                uid,
                refresh_token: refreshToken,
                new_only: true,
                service_id: service._id,
                cron: true,
              },
            );
          }
          default: {
            return null;
          }
        }
      });

    try {
      await Promise.all(prs.filter((pr) => pr));
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
  }
}
