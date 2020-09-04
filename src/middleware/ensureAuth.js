/* eslint-disable no-underscore-dangle */
import axios from 'axios';

export default (handler) => (req, res) => {
  const {
    token,
    uid,
    refresh_token: reqRefreshToken,
    skip_auth: skipAuth = false,
    api_only: apiOnly = false,
  } = req.body;

  return new Promise((resolve) => {
    async function perform() {
      if (!token && !uid && !(skipAuth || apiOnly)) {
        return res.status(401).json({
          error: 'either `token` or `uid` is required',
        });
      }

      if (reqRefreshToken) {
        req.refresh_token = reqRefreshToken;
      }

      if (skipAuth) {
        return handler(req, res, resolve);
      }

      let userCreds;
      let userRefreshToken;
      if (uid) {
        try {
          const userRes = await axios(
            `${process.env.EMAILAPI_BASE_URL}/users/${uid}`,
          );
          userCreds = userRes.data;
          userRefreshToken = userCreds.refreshToken;
        } catch (e) {
          console.log(e);
          res.status(500).json({ error: '[ensureAuth] user not found!' });
          return handler(req, res, resolve);
        }
      } else {
        const { data: firebaseData } = await axios.post(
          `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/firebase/login`,
          {
            token,
          },
        );

        const { data: users } = await axios.get(
          `${process.env.EMAILAPI_BASE_URL}/users?q=uid:${firebaseData.decodedToken.uid}`,
        );

        if (Array.isArray(users) && !users.length) {
          res.status(500).json({ error: 'user not found in db!' });
          return handler(req, res, resolve);
        }

        const validUser = users.filter((user) => !user.is_deleted);

        if (validUser.length > 1) {
          res
            .status(500)
            .json({ error: 'more than 1 user with this email in db!' });
          return handler(req, res, resolve);
        }

        [userCreds] = validUser;
        userRefreshToken = userCreds.refreshToken;
      }

      req.user = userCreds.profile;
      if (!req.refresh_token) {
        req.refresh_token = userRefreshToken;
      }
      return handler(req, res, resolve);
    }

    perform();
  });
};
