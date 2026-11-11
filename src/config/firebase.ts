import admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env';

let app: admin.app.App;

try {
  if (!fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    throw new Error(
      `Firebase service account key file not found at: ${env.FIREBASE_SERVICE_ACCOUNT_PATH}`
    );
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8')
  );

  if (admin.apps.length === 0) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    app = admin.apps[0]!;
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

export const firestore = admin.firestore(app);
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export { admin };
