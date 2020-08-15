/* eslint-disable import/prefer-default-export */
// From:
// https://github.com/zeit/next.js/blob/canary/examples/with-firebase-authentication/pages/index.js

import fetch from 'isomorphic-unfetch';

export const setSession = (user) => {
  // Log in.
  if (user) {
    return user.getIdToken().then((token) => {
      return fetch('/api/firebase/login', {
        method: 'POST',
        // eslint-disable-next-line no-undef
        headers: new Headers({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify({ token, uid: user.uid }),
      });
    });
  }

  // Log out.
  return fetch('/api/firebase/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
};
