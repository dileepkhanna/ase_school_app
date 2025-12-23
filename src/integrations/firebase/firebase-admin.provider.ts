// import { Provider } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import * as fs from 'fs';
// import * as path from 'path';

// export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

// function initFirebase(): admin.app.App {
//   // Prevent re-initialization in watch mode
//   if (admin.apps.length) return admin.app();

//   const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
//   const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

//   let serviceAccount: admin.ServiceAccount;

//   if (jsonInline && jsonInline.trim().length) {
//     serviceAccount = JSON.parse(jsonInline);
//   } else if (jsonPath && jsonPath.trim().length) {
//     const abs = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(process.cwd(), jsonPath);
//     if (!fs.existsSync(abs)) {
//       throw new Error(`Firebase service account file not found at: ${abs}`);
//     }
//     serviceAccount = JSON.parse(fs.readFileSync(abs, 'utf8'));
//   } else {
//     throw new Error(
//       'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env',
//     );
//   }

//   return admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export const firebaseAdminProvider: Provider = {
//   provide: FIREBASE_ADMIN,
//   useFactory: () => initFirebase(),
// };





import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

function initFirebase(): admin.app.App {
  // Prevent re-initialization in watch mode
  if (admin.apps.length) return admin.app();

  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let serviceAccount: admin.ServiceAccount;

  if (jsonInline && jsonInline.trim().length) {
    serviceAccount = JSON.parse(jsonInline) as admin.ServiceAccount;
  } else if (jsonPath && jsonPath.trim().length) {
    const abs = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(process.cwd(), jsonPath);
    if (!fs.existsSync(abs)) {
      throw new Error(`Firebase service account file not found at: ${abs}`);
    }
    serviceAccount = JSON.parse(fs.readFileSync(abs, 'utf8')) as admin.ServiceAccount;
  } else {
    throw new Error(
      'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env',
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: () => initFirebase(),
};
