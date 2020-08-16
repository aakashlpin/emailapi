const { google } = require('googleapis');

export default async function exchangeToken(req, res) {
  const { token } = req.query;
  const oAuth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
  );

  return new Promise((resolve) => {
    oAuth2Client.getToken(token, (err, tokenResponse) => {
      if (err) res.status(500).json(err);

      // eslint-disable-next-line camelcase
      const { id_token, refresh_token } = tokenResponse;
      res.json({ id_token, refresh_token });
      resolve();
    });
  });
}
