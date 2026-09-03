import {
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  getFirestore,
} from 'firebase/firestore';
import { app } from './firebaseApp';

export const db = getFirestore(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

enableIndexedDbPersistence(db).catch((error) => {
  if (error.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (error.code === 'unimplemented') {
    console.warn('Persistence not available in this browser');
  }
});
