const axios = require('axios');

export default async function handle(req, res) {
  const { refresh_token: refreshToken, uid } = req.body;
  try {
    const { data: userServices } = await axios(
      `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/services`,
    );

    userServices
      .filter((service) => service.cron)
      .forEach(async (service) => {
        switch (service.app) {
          case 'EMAIL_TO_JSON': {
            axios.post(
              `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/apps/email-to-json`,
              {
                uid,
                refresh_token: refreshToken,
                new_only: true,
                service_id: service._id,
                cron: true,
              },
            );
            break;
          }
          case 'AUTO_UNLOCK': {
            axios.post(
              `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/apps/auto-unlock`,
              {
                uid,
                refresh_token: refreshToken,
                new_only: true,
                service_id: service._id,
                cron: true,
              },
            );
            break;
          }
          default: {
            break;
          }
        }
      });
  } catch (e) {
    console.log(e);
  }
  res.json({});
}
