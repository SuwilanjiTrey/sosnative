// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBYMJVz1L9O5TY5LD_x1Tj4OX6gRZmAVq8",
    authDomain: "th1ne-010.firebaseapp.com",
    projectId: "th1ne-010",
    storageBucket: "th1ne-010.firebasestorage.app",
    messagingSenderId: "109865250582",
    appId: "1:109865250582:web:7da316259557f973b32a37",
    measurementId: "G-H6ESMPHLZK"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);