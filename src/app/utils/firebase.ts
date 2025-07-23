// src/utils/firebase.ts
import admin from 'firebase-admin';
import serviceAccount from '../../../firebase-service-account.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const firebaseAdmin = admin;
export default firebaseAdmin;
