/* eslint-disable no-underscore-dangle */
import commonMiddleware from '~/src/middleware/commonMiddleware';
import { verifyIdToken } from '~/src/firebase/firebaseAdmin';
import { userExists } from './user';

const handler = async (req, res) => {
  if (!req.body) {
    return res.status(400);
  }

  const { token, uid } = req.body;
  if (!token) {
    return res.status(500).json({ error: 'token not found' });
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
  const decodedToken = await verifyIdToken(token);
  let _id;
  if (uid) {
    try {
      const dbUser = await userExists(uid);
      _id = dbUser._id;
    } catch (e) {
      return res.status(500).send(e);
    }
  }
  req.session.decodedToken = decodedToken;
  req.session.token = token;
  req.session.uid = _id;
  return res.json({ status: true, decodedToken, uid: _id });
};

export default commonMiddleware(handler);
