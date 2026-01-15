// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

//changes added to prevent deletion

const firebaseConfig = {
  apiKey: "AIzaSyBAkOFer1aTaU2wHCR-lJfSAKfKfEm2Nrk",
  authDomain: "safecircle-security.firebaseapp.com",
  projectId: "safecircle-security",
  storageBucket: "safecircle-security.firebasestorage.app",
  messagingSenderId: "915761650322",
  appId: "1:915761650322:web:cb3ac3ea4835bf89aea44b",
  measurementId: "G-E00DNRMFDY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);