import firebase from 'firebase/app';
import 'firebase/auth';

export default function initFirebase() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  if (!firebase.apps.length) {
    console.log('firebase config object via nextjs');
    console.log(config);
    console.log('firebase raw envs');
    console.log({
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
      FIREBASE_PUBLIC_API_KEY: process.env.FIREBASE_PUBLIC_API_KEY,
    });
    firebase.initializeApp(config);
  }
}
