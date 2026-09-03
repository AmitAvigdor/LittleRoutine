import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { app } from './firebaseApp';

export const storage = getStorage(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectStorageEmulator(storage, 'localhost', 9199);
}
