/* eslint-disable no-underscore-dangle */
import commonMiddleware from '~/src/middleware/commonMiddleware';
import { verifyIdToken } from '~/src/firebase/firebaseAdmin';
import { userExists } from './user';

// const { log } = require('~/src/integrations/utils');

const handler = (req, res, resolve) => {
  if (!req.body) {
    res.status(400);
    return resolve();
  }

  const { token, uid } = req.body;
  if (!token) {
    res.status(500).json({ error: 'token not found' });
    return resolve();
  }

  // Here, we decode the user's Firebase token and store it in a cookie. Use
  // express-session (or similar) to store the session data server-side.
  // An alternative approach is to use Firebase's `createSessionCookie`. See:
  // https://firebase.google.com/docs/auth/admin/manage-cookies
  // Firebase docs:
  //   "This is a low overhead operation. The public certificates are initially
  //    queried and cached until they expire. Session cookie verification can be
  //    done with the cached public certificates without any additional network
  //    requests."
  // However, in a serverless environment, we shouldn't rely on caching, so
  // it's possible Firebase's `verifySessionCookie` will make frequent network
  // requests in a serverless context.
  return verifyIdToken(token)
    .then(async (decodedToken) => {
      let _id;
      if (uid) {
        try {
          const dbUser = await userExists(uid);
          _id = dbUser._id;
        } catch (e) {
          res.status(500).send(e);
        }
      }
      req.session.decodedToken = decodedToken;
      req.session.token = token;
      req.session.uid = _id;
      if (_id) {
        return { decodedToken, uid: _id };
      }
      return { decodedToken };
    })
    .then((props) => {
      res.status(200).json({ status: true, ...props });
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

export default commonMiddleware(handler);
