import { get, has } from 'lodash/object';

/**
 * Take the user object from Firebase (from either the Firebase admin SDK or
 * or the client-side Firebase JS SDK) and return a consistent AuthUser object.
 * @param {Object} firebaseUser - A decoded Firebase user token or JS SDK
 *   Firebase user object.
 * @return {Object|null} AuthUser - The user object.
 * @return {String} AuthUser.id - The user's ID
 * @return {String} AuthUser.email - The user's email
 * @return {Boolean} AuthUser.emailVerified - Whether the user has verified their email
 */
export const createAuthUser = (firebaseUser) => {
  if (!firebaseUser || !firebaseUser.uid) {
    return null;
  }
  return firebaseUser;
};

/**
 * Create an object with an AuthUser object and AuthUserToken value.
 * @param {Object} firebaseUser - A decoded Firebase user token or JS SDK
 *   Firebase user object.
 * @param {String} firebaseToken - A Firebase auth token string.
 * @return {Object|null} AuthUserInfo - The auth user info object.
 * @return {String} AuthUserInfo.AuthUser - An AuthUser object (see
 *   `createAuthUser` above).
 * @return {String} AuthUser.token - The user's encoded Firebase token.
 */
export const createAuthUserInfo = ({
  firebaseUser = null,
  token = null,
  uid = null,
} = {}) => {
  return {
    AuthUser: createAuthUser(firebaseUser),
    token,
    uid,
  };
};
