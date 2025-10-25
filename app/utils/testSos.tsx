// utils/testSOS.ts
import { db, auth } from '../../firebaseConfig';
import { doc, setDoc, collection } from 'firebase/firestore';

export const createTestSOS = async (responderId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No authenticated user");
      return;
    }

    // Create a test SOS document
    const sosRef = doc(collection(db, "Responders", responderId, "SOS"));
    await setDoc(sosRef, {
      madeBy: "testUserId",
      location: {
        latitude: -15.3875,
        longitude: 28.3228
      },
      information: "Test emergency - please ignore",
      contact: "+260123456789",
      status: 'active',
      createdAt: new Date()
    });

    console.log("Test SOS created successfully");
  } catch (error) {
    console.error("Error creating test SOS:", error);
  }
};