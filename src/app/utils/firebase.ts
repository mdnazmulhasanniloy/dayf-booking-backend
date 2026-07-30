import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(process.cwd(), 'firebase-service-account.json');

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8'),
) as admin.ServiceAccount;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firebaseAdmin = admin;
export default firebaseAdmin;
