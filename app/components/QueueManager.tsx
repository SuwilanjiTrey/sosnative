// components/QueueManager.tsx
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getPendingSOS, removeSOS, updateSOS } from '../utils/db';
import { db } from '../../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

export default function QueueManager() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        flushQueue();
      }
    });

    // Also flush on mount
    flushQueue();

    return () => unsubscribe();
  }, []);

  const flushQueue = async () => {
    const queue = await getPendingSOS();
    if (queue.length === 0) return;

    for (const sos of queue) {
      if (sos.retryCount > 3) {
        console.warn(`SOS ${sos.id} failed too many times.`);
        continue;
      }

      try {
        // Write to Firestore
        const docRef = await addDoc(collection(db, 'sosRecords'), {
          ...sos,
          status: 'sent',
          delivery: { emailSent: false, pushSent: false, smsSent: false },
          acks: [],
          createdAt: new Date(sos.createdAt)
        });

        // Remove from local queue
        await removeSOS(sos.id);
        Toast.show({ type: 'success', text1: `SOS ${sos.id.slice(0,6)} synced` });
      } catch (error) {
        console.error(`Failed to sync SOS ${sos.id}:`, error);
        await updateSOS(sos.id, { retryCount: sos.retryCount + 1, lastAttemptAt: new Date().toISOString() });
        Toast.show({ type: 'error', text1: `Retry ${sos.id.slice(0,6)}` });
      }
    }
  };

  return null; // This is a background worker component
}