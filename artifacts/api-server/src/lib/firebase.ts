import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!credentialJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be configured to use Firestore.");
}

let serviceAccount: unknown;
try {
  serviceAccount = JSON.parse(credentialJson);
} catch {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
}

const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount as never) });

export const firestore = getFirestore(app);
firestore.settings({ preferRest: true });