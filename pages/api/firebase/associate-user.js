const { google } = require('googleapis');
const axios = require('axios');

const oAuth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
);

async function migrateMailboxToUser({ fromUser, fromUid, toUid }) {
  const fromUidMailboxes = await axios(
    `${process.env.JSONBOX_NETWORK_URL}/${fromUid}/mailbox`,
  );
  const toUidMailboxes = await axios.post(
    `${process.env.JSONBOX_NETWORK_URL}/${toUid}/mailbox`,
    fromUidMailboxes.data.map((item) => ({
      email: item.email,
    })),
  );
  await axios.put(`${process.env.NEXT_PUBLIC_EMAILAPI_BASE_URI}/${fromUid}`, {
    ...fromUser,
    is_deleted: true,
  });
  return toUidMailboxes.data;
}

export default async function AssociateUser(req, res) {
  const { uid, email, firebase_uid: firebaseUid } = req.body;
  let { refresh_token: refreshToken } = req.body;
  let existingUserByEmail;

  if (!refreshToken) {
    try {
      const userByEmailRes = await axios(
        `${
          process.env.NEXT_PUBLIC_EMAILAPI_BASE_URI
        }/users?q=email:${encodeURIComponent(email)}`,
      );
      if (Array.isArray(userByEmailRes.data) && userByEmailRes.data.length) {
        try {
          [existingUserByEmail] = userByEmailRes.data;
          refreshToken = existingUserByEmail.refreshToken;
        } catch (e) {
          return res.status(400).json({
            error: 'neither refresh_token received, nor user by email found',
          });
        }
      }
    } catch (e) {
      return res.status(400).send(e);
    }
  }

  if (existingUserByEmail) {
    const { _id } = existingUserByEmail;
    const fromUid = uid;
    const toUid = _id;
    if (fromUid !== toUid) {
      const migratedData = await migrateMailboxToUser({
        fromUser: existingUserByEmail,
        fromUid,
        toUid,
      });
      return res.json({
        uid: toUid,
        mailboxes: migratedData,
      });
    }

    return res.json({});
  }

  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const oauth2 = google.oauth2({
    auth: oAuth2Client,
    version: 'v2',
  });

  return new Promise((resolve) => {
    oauth2.userinfo.get(async (userInfoGetError, userInfo) => {
      if (userInfoGetError) {
        res.status(500).json(userInfoGetError);
        return;
      }

      let currentUserInDb;
      try {
        const userRes = await axios.get(
          `${process.env.NEXT_PUBLIC_EMAILAPI_BASE_URI}/users/${uid}`,
        );
        currentUserInDb = userRes.data;
      } catch (e) {
        res.status(500).json({ error: e });
      }

      const { data: profile } = userInfo;
      const updatedUser = {
        ...currentUserInDb,
        uid: firebaseUid,
        refreshToken,
        profile,
      };

      try {
        await axios.put(
          `${process.env.NEXT_PUBLIC_EMAILAPI_BASE_URI}/users/${uid}`,
          updatedUser,
        );
        res.json(updatedUser);
      } catch (e) {
        res.status(500).json({ error: e });
      }

      resolve();
    });
  });
}
