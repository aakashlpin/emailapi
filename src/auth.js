const { google } = require('googleapis');

function authorize(refreshToken, callback) {
  // [TODO] add error handling
  const oAuth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
  );
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  callback(oAuth2Client);
}

module.exports = (refreshToken) =>
  new Promise((resolve) => {
    return authorize(refreshToken, (auth) => {
      resolve(auth);
    });
  });
