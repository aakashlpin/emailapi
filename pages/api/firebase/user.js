const { google } = require('googleapis');
const axios = require('axios');

const EMAILAPI_BASE_URI = process.env.NEXT_PUBLIC_EMAILAPI_BASE_URL;

const oAuth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
);

export async function userExists(firebaseUid) {
  // [TODO] find and replace all instances of `uid` with `firebase_uid`. making it clear that `_id` is our `uid`
  let userProfile;
  try {
    const endpoint = `${EMAILAPI_BASE_URI}/users?q=uid:${firebaseUid}`;
    console.log('sending request to...', endpoint);
    const response = await axios.get(endpoint);
    userProfile =
      Array.isArray(response.data) && !response.data.length
        ? null
        : response.data[0];
  } catch (getProfileError) {
    console.log({ getProfileError });
    userProfile = null;
  }
  return userProfile;
}

async function dbSyncup({ firebaseUid, profile, refreshToken, existingUser }) {
  // const { id, email, verified_email, name, given_name, family_name, picture, locale } = profile;
  const userProfile = existingUser || (await userExists(firebaseUid));
  if (!userProfile) {
    const { data: newUserProfile } = await axios.post(
      `${EMAILAPI_BASE_URI}/users`,
      {
        uid: firebaseUid,
        email: profile.email,
        refreshToken,
        profile,
      },
    );
    return newUserProfile;
  }

  const updatedUserProfile = {
    ...userProfile,
    profile,
  };
  if (refreshToken) {
    // user revoked the app from google permissions, and is now signing up again
    updatedUserProfile.refreshToken = refreshToken;
  }
  await axios.put(
    `${EMAILAPI_BASE_URI}/users/${userProfile._id}`,  //eslint-disable-line
    updatedUserProfile,
  );
  return updatedUserProfile;
}

export default function User(req, res) {
  return new Promise((resolve) => {
    async function perform() {
      const { firebase_uid: firebaseUid } = req.body;
      let existingUser;
      let refreshToken = req.body.refresh_token;
      if (!refreshToken) {
        try {
          existingUser = await userExists(firebaseUid);
          refreshToken = existingUser.refreshToken;
        } catch (e) {
          console.log('existingUser not found. did the db change?');
          console.log(e);
          res
            .status(500)
            .json({ error: 'try to uninstall app from /persmissions' });
          return;
        }
      }

      oAuth2Client.setCredentials({ refresh_token: refreshToken });

      const oauth2 = google.oauth2({
        auth: oAuth2Client,
        version: 'v2',
      });

      oauth2.userinfo.get(async (userInfoGetError, userInfo) => {
        if (userInfoGetError) {
          res.status(500).json(userInfoGetError);
          resolve();
          return;
        }

        const { data: profile } = userInfo;

        const dbUser = await dbSyncup({
          profile,
          firebaseUid,
          refreshToken,
          existingUser,
        });

        res.json(dbUser);
        resolve();
      });
    }
    perform();
  });
}
