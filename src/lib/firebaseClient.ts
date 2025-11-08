import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFirestore, Firestore } from 'firebase/firestore';

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let db: Firestore | undefined;

// Only initialize Firebase if required env keys are provided
if (cfg.apiKey && cfg.projectId && cfg.appId) {
  try {
    app = initializeApp(cfg as any);
    auth = getAuth(app);
    storage = getStorage(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Failed to initialize Firebase client:', err);
  }
} else {
  console.warn('Firebase env not set. Skipping client init.');
}

export { app, auth, storage, db };