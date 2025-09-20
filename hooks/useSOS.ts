// hooks/useSOS.ts
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getPendingSOS } from '../app/utils/db';
import { auth, db } from '../firebaseConfig';

export type SOSRecord = {
  id: string;
  createdAt: any;
  location?: { lat: number; lng: number; accuracy?: number | null };
  status: string;
  acks?: any[];
  local?: boolean;
};

export function useSOS() {
  const [records, setRecords] = useState<SOSRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log('No user logged in');
      setRecords([]);
      setLoading(false);
      return;
    }

    console.log('Fetching SOS records for user:', uid);

    // Load local queued SOS
    getPendingSOS()
      .then((local) => {
        console.log('Loaded local SOS:', local.length);
        setRecords(local.map((r) => ({ ...r, local: true })));
      })
      .catch((err) => {
        console.error('Failed to load local SOS:', err);
      });

    // Listen to Firestore SOS records
    const q = query(collection(db, 'sosRecords'), where('userId', '==', uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('Firestore snapshot received:', snapshot.docs.length);
        const remote = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          local: false,
        })) as SOSRecord[];

        getPendingSOS()
          .then((local) => {
            const combined = [
              ...local.map((r) => ({ ...r, local: true })),
              ...remote,
            ];
            setRecords(combined);
            setLoading(false); // 👈 SET LOADING TO FALSE HERE
            console.log('Final records:', combined.length);
          })
          .catch((err) => {
            console.error('Failed to reload local queue:', err);
            setLoading(false);
          });
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setLoading(false); // 👈 ALSO SET FALSE ON ERROR
      }
    );

    return () => unsubscribe();
  }, []);

  const syncQueue = async () => {
    // Trigger reload
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    const local = await getPendingSOS();
    const q = query(collection(db, 'sosRecords'), where('userId', '==', uid));
    const snapshot = await (await import('firebase/firestore')).getDocs(q);
    const remote = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      local: false,
    })) as SOSRecord[];

    setRecords([...local.map((r) => ({ ...r, local: true })), ...remote]);
    setLoading(false);
  };

  return { records, loading, syncQueue };
}