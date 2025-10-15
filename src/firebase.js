// v1.0: Firebase initialization with detailed setup guidance for Realtime Database usage.
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Firebase Setup Instructions:
 * 1. Visit https://console.firebase.google.com/ and create a new project.
 * 2. Within the project console, add a new Web app (</>) and register it.
 * 3. Enable the Realtime Database from the Build section and choose "Start in production mode" for security.
 * 4. Copy the configuration values into a `.env` file using the variable names referenced above.
 * 5. In the Realtime Database Rules tab, ensure authenticated reads/writes or restrict access to known users.
 * 6. Deploy the rules and share the generated databaseURL in your environment variables.
 */
function assertValidConfig(configObject) {
  const missing = Object.entries(configObject)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const message = `Missing Firebase environment variables: ${missing.join(', ')}.`;
    throw new Error(message);
  }
}

let firebaseApp;
if (!getApps().length) {
  assertValidConfig(firebaseConfig);
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

export const database = getDatabase(firebaseApp);
