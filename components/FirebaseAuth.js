import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import firebase from 'firebase/app';
import 'firebase/auth';
import GoogleLogin from 'react-google-login';
import axios from 'axios';
import initFirebase from '~/src/firebase/initFirebase';

const SignInWithGmail = styled.button`
  border: 2px solid #ffc107;
  padding: 4px 8px;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

// Init the Firebase app.
initFirebase();

const FirebaseAuth = ({
  uid = null,
  GOOGLE_CLIENT_ID,
  buttonLabel = 'Continue with Google Mail',
  scope = 'profile email https://www.googleapis.com/auth/gmail.readonly',
  callback = () => {
    console.log('auth successful, but no callback supplied!');
  },
}) => {
  // Do not SSR FirebaseUI, because it is not supported.
  // https://github.com/firebase/firebaseui-web/issues/213
  const [renderAuth, setRenderAuth] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRenderAuth(true);
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function onGoogleSignIn({ code }) {
    setIsLoading(true);
    console.log('exchanging auth code for tokens...');
    const response = await axios(`/api/firebase/exchange-token?token=${code}`);
    console.log('[done] exchanging auth code for tokens...');
    const { id_token: idToken, refresh_token: refreshToken } = response.data;

    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);

    console.log('signin into firebase...');
    firebase
      .auth()
      .signInWithCredential(credential)
      .then(async () => {
        console.log('[done] signin into firebase...');
        const { currentUser } = firebase.auth();
        let dbUser;
        if (!uid) {
          console.log('setting up user in db...');
          dbUser = await axios.post(`/api/firebase/user`, {
            refresh_token: refreshToken,
            firebase_uid: currentUser.uid,
          });
          callback(null, dbUser.data._id);
        } else {
          // [TODO] if this users email/firebase_uid already exists, then
          // 1. discard/delete the current browser uid (and hence the orphan db user)
          //  1.1. associate this mailbox to existing user
          // 2. refresh the page with existing user's uid

          console.log('associating firebase user in with uid...');
          console.log({ currentUser });
          dbUser = await axios.post(`/api/firebase/associate-user`, {
            uid,
            email: currentUser.email,
            firebase_uid: currentUser.uid,
            refresh_token: refreshToken,
          });
          callback(null, dbUser.data);
        }
        console.log('[done] setting up user in db...', dbUser.data);
        // eslint-disable-next-line no-underscore-dangle
        setIsLoading(false);
        setIsLoggedIn(true);
      })
      .catch((e) => {
        console.log(e);
        callback(e, null);
        setIsLoading(false);
        setIsLoggedIn(false);
      });
  }

  function onGoogleSignInFailure(args) {
    console.log(args);
  }

  return (
    <>
      {renderAuth && !isLoading && !isLoggedIn ? (
        <GoogleLogin
          clientId={GOOGLE_CLIENT_ID}
          accessType="offline"
          responseType="code"
          buttonText="Login"
          scope={scope}
          onSuccess={onGoogleSignIn}
          onFailure={onGoogleSignInFailure}
          cookiePolicy="single_host_origin"
          render={(renderProps) => (
            <SignInWithGmail
              type="button"
              onClick={renderProps.onClick}
              disabled={renderProps.disabled}
            >
              {buttonLabel}
            </SignInWithGmail>
          )}
        />
      ) : null}
      {isLoading ? (
        <SignInWithGmail type="button" disabled>
          {buttonLabel}
        </SignInWithGmail>
      ) : null}
      {!isLoading && isLoggedIn ? `` : null}
    </>
  );
};

export default FirebaseAuth;
