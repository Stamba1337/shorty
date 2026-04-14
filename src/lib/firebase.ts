import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Config loaded from env vars.
// Locally: .env file (gitignored). Production: Vercel → Settings → Environment Variables.
//
// Firestore rules (Firebase console → Firestore → Rules):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /links/{slug} {
//       allow read: if true;
//       allow create: if request.auth != null;
//       allow update, delete: if request.auth != null
//                             && resource.data.uid == request.auth.uid;
//       match /events/{eventId} {
//         allow read: if request.auth != null
//                     && get(/databases/$(database)/documents/links/$(slug)).data.uid == request.auth.uid;
//         allow create: if true;
//       }
//     }
//   }
// }
//
// Storage rules (Firebase console → Storage → Rules):
// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /uploads/{userId}/{allPaths=**} {
//       allow read: if true;
//       allow write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
