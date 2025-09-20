// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { auth } from '../firebaseConfig';

export default function Index() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        // Not logged in → redirect to login
      }
    });
    return unsubscribe;
  }, []);

  return <Redirect href="/(drawer)/dashboard" />;
}