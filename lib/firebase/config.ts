import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB-LtcneAdnA0HyQtdzsAF9Cm3NKoaxju4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dailytaskpay-73fac.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dailytaskpay-73fac",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dailytaskpay-73fac.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "238062541151",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:238062541151:web:10aa291bb82d7b95ecfeea",
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

export default app;
