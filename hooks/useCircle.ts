// hooks/useCircle.ts
import { collection, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '../firebaseConfig';

export type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  invitedAt?: string;
};

export function useCircle() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setContacts([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'circles'), where('ownerId', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const circle = snapshot.docs[0].data();
        setContacts(circle.members || []);
      } else {
        setContacts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addContact = async (name: string, email?: string, phone?: string) => {
    if (!name || (!email && !phone)) {
      throw new Error('Name and at least one contact method required.');
    }

    const newContact = {
      id: uuidv4(),
      name,
      email,
      phone,
      invitedAt: new Date().toISOString(),
    };

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('User not authenticated');

    const q = query(collection(db, 'circles'), where('ownerId', '==', uid));
    const snapshot = await (await import('firebase/firestore')).getDocs(q);

    if (!snapshot.empty) {
      const circleDoc = snapshot.docs[0];
      const updatedMembers = [...(circleDoc.data().members || []), newContact];
      await updateDoc(circleDoc.ref, { members: updatedMembers });
    } else {
      await (await import('firebase/firestore')).addDoc(collection(db, 'circles'), {
        ownerId: uid,
        name: 'My Circle',
        members: [newContact],
        createdAt: new Date(),
      });
    }
  };

  const removeContact = async (contactId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(collection(db, 'circles'), where('ownerId', '==', uid));
    const snapshot = await (await import('firebase/firestore')).getDocs(q);
    if (snapshot.empty) return;

    const circleDoc = snapshot.docs[0];
    const updatedMembers = (circleDoc.data().members || []).filter(
      (c: any) => c.id !== contactId
    );
    await updateDoc(circleDoc.ref, { members: updatedMembers });
  };

  return { contacts, loading, addContact, removeContact };
}