// hooks/useSubscriptionChecker.ts
// Add this hook to check and expire subscriptions automatically
import { useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './useAuth';

export const useSubscriptionChecker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkSubscription = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return;

        const userData = userDoc.data();

        // Check if user has premium and if it has expired
        if (userData.isPremium && userData.premiumEndDate) {
          const endDate = userData.premiumEndDate.toDate();
          const now = new Date();

          // If subscription has expired
          if (now > endDate) {
            console.log('Subscription expired, updating user status...');
            
            await updateDoc(userRef, {
              isPremium: false,
              subscriptionExpiredAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            console.log('Subscription successfully expired');
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    // Check immediately on mount
    checkSubscription();

    // Check every hour
    const interval = setInterval(checkSubscription, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);
};

// Alternative: Manual check function you can call anywhere
export const checkAndExpireSubscription = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { expired: false, message: 'User not found' };
    }

    const userData = userDoc.data();

    if (userData.isPremium && userData.premiumEndDate) {
      const endDate = userData.premiumEndDate.toDate();
      const now = new Date();

      if (now > endDate) {
        await updateDoc(userRef, {
          isPremium: false,
          subscriptionExpiredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return { expired: true, message: 'Subscription expired and updated' };
      }

      return { expired: false, message: 'Subscription still active' };
    }

    return { expired: false, message: 'User is not premium' };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { expired: false, message: 'Error checking subscription' };
  }
};