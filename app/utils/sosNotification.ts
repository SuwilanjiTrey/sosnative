// utils/sosNotification.ts
import { db, auth } from '../../firebaseConfig';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

interface SOSData {
  userId: string;
  userName: string;
  userPhone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  information?: string;
}

export const sendSOSNotification = async (sosData: SOSData) => {
  const currentUser = auth.currentUser;
  
  // Better validation of the current user
  if (!currentUser || !currentUser.uid) {
    console.error("User not authenticated or UID is missing");
    throw new Error('User not authenticated properly');
  }

  console.log("Sending SOS notification for user:", currentUser.uid);

  try {
    // First, get user data to check if they're premium
    const userDocQuery = query(collection(db, "users"), where("__name__", "==", currentUser.uid));
    const userDocSnapshot = await getDocs(userDocQuery);
    
    if (userDocSnapshot.empty) {
      console.error("User document not found in users collection");
      throw new Error('User profile not found');
    }
    
    const userData = userDocSnapshot.docs[0].data();
    const isPremium = userData.isPremium === true; // Explicit boolean check
    console.log("User premium status:", isPremium);
    console.log("User plan:", userData.premiumPlan || 'basic');

    // ALWAYS send to circle members (for both basic and premium users)
    console.log("Sending notifications to circle members...");
    const circlesQuery = query(
      collection(db, "users", currentUser.uid, "circles"), 
      where("status", "==", "accepted")
    );
    
    const circlesSnapshot = await getDocs(circlesQuery);
    console.log(`Found ${circlesSnapshot.size} circle members`);

    // Get all unique mobile numbers from circle members
    const mobileNumbers = circlesSnapshot.docs
      .map(doc => doc.data().mobileNumber)
      .filter(phone => phone && typeof phone === 'string' && phone.trim() !== '');

    console.log("Mobile numbers to look up:", mobileNumbers);

    // Find user UIDs for these mobile numbers
    const memberUidMap = new Map<string, string>();
    
    if (mobileNumbers.length > 0) {
      // Firestore 'in' queries are limited to 10 items, so we need to batch
      const batches = [];
      for (let i = 0; i < mobileNumbers.length; i += 10) {
        const batch = mobileNumbers.slice(i, i + 10);
        const usersQuery = query(
          collection(db, "users"),
          where("mobileNumber", "in", batch)
        );
        batches.push(getDocs(usersQuery));
      }
      
      const allSnapshots = await Promise.all(batches);
      
      allSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.mobileNumber) {
            memberUidMap.set(userData.mobileNumber, doc.id);
          }
        });
      });
      
      console.log("Found UIDs for mobile numbers:", memberUidMap);
    }

    // Send notifications to circle members
    const notificationPromises = circlesSnapshot.docs.map(async (circleDoc) => {
      try {
        const circleData = circleDoc.data();
        const memberPhone = circleData.mobileNumber;
        const memberName = circleData.name;
        
        console.log("Processing circle member:", memberName, memberPhone);
        
        // Get the member's UID from our map
        const memberUid = memberUidMap.get(memberPhone);
        
        if (!memberUid) {
          console.warn(`No registered user found for mobile number: ${memberPhone}. Member: ${memberName}`);
          // This member might not be registered (isRegistered: false)
          // We'll skip them since they can't receive in-app notifications
          return null;
        }
        
        console.log(`Found UID ${memberUid} for ${memberName} (${memberPhone})`);
        
        // Create the notification
        const notificationsCollection = collection(db, "users", memberUid, "notifications");
        const notificationRef = doc(notificationsCollection);
        
        const notificationData = {
          category: "Emergency",
          circleMemberId: circleDoc.id,
          createdAt: new Date(),
          fromUserId: currentUser.uid,
          fromUserName: sosData.userName,
          fromUserPhone: sosData.userPhone,
          message: `${sosData.userName} has sent an SOS alert! Location: ${sosData.location.latitude}, ${sosData.location.longitude}`,
          status: "pending",
          type: "sos_alert"
        };
        
        console.log("Creating notification for member:", memberUid, notificationData);
        await setDoc(notificationRef, notificationData);
        console.log("Notification created successfully for:", memberName);
        return { success: true, memberId: memberUid, memberName };
      } catch (error) {
        console.error("Error creating notification for circle member:", circleDoc.id, error);
        return { success: false, error: error.message, memberName: circleData?.name };
      }
    });

    // Wait for all circle notifications
    const results = await Promise.all(notificationPromises);
    const successfulNotifications = results.filter(r => r && r.success);
    const failedNotifications = results.filter(r => r && !r.success);
    const skippedMembers = results.filter(r => r === null);
    
    console.log(`Successfully sent ${successfulNotifications.length} notifications to circle members`);
    if (failedNotifications.length > 0) {
      console.error("Failed notifications:", failedNotifications);
    }
    if (skippedMembers.length > 0) {
      console.log(`Skipped ${skippedMembers.length} members (not registered in app)`);
    }

    // ONLY send to responders if user is premium
    if (isPremium) {
      console.log("User is premium, sending to nearby responders...");
      try {
        await sendToResponders(sosData);
      } catch (responderError) {
        console.error("Error sending to responders, but SOS to circles was successful:", responderError);
        // Don't throw here - circle notifications were successful
      }
    } else {
      console.log("User is basic - not sending to responders");
    }

    return true;
  } catch (error) {
    console.error("Error sending SOS notification:", error);
    throw error;
  }
};

const sendToResponders = async (sosData: SOSData) => {
  try {
    // Get all responders
    const respondersSnapshot = await getDocs(collection(db, "Responders"));
    console.log(`Found ${respondersSnapshot.size} responders in the system`);
    
    if (respondersSnapshot.empty) {
      console.log("No responders found in the system");
      return;
    }
    
    // Get user's current location
    const userLocation = sosData.location;
    console.log("User location for responder matching:", userLocation);
    
    // Send SOS to nearby responders (within 10km radius)
    const nearbyResponderPromises = respondersSnapshot.docs.map(async (responderDoc) => {
      try {
        const responderData = responderDoc.data();
        
        // Validate responder location
        if (!responderData.location || 
            typeof responderData.location.latitude !== 'number' || 
            typeof responderData.location.longitude !== 'number') {
          console.warn(`Responder ${responderDoc.id} (${responderData.institutionName}) has no valid location, skipping`);
          return null;
        }
        
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          responderData.location.latitude,
          responderData.location.longitude
        );
        
        console.log(`Responder ${responderData.institutionName || responderDoc.id} is ${distance.toFixed(2)}km away`);
        
        // If responder is within 10km
        if (distance <= 4000) {
          // Create the SOS subcollection reference safely
          const sosCollection = collection(db, "Responders", responderDoc.id, "SOS");
          const sosRef = doc(sosCollection);
          
          const sosDataForResponder = {
            madeBy: sosData.userId,
            location: userLocation,
            information: sosData.information || '',
            contact: sosData.userPhone,
            status: 'active',
            createdAt: new Date()
          };
          
          console.log(`Creating SOS for nearby responder: ${responderData.institutionName || responderDoc.id}`);
          await setDoc(sosRef, sosDataForResponder);
          console.log(`SOS sent to responder ${responderDoc.id}`);
          return {
            responderId: responderDoc.id,
            institutionName: responderData.institutionName,
            distance: distance
          };
        }
        return null;
      } catch (error) {
        console.error(`Error sending SOS to responder ${responderDoc.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(nearbyResponderPromises);
    const successfulSends = results.filter(r => r !== null);
    
    if (successfulSends.length > 0) {
      console.log(`Successfully sent SOS to ${successfulSends.length} nearby responders:`);
      successfulSends.forEach(send => {
        console.log(`  - ${send.institutionName} (${send.distance.toFixed(2)}km away)`);
      });
    } else {
      console.log("No nearby responders found within 10km radius");
    }
    
  } catch (error) {
    console.error("Error sending to responders:", error);
    throw error;
  }
};

// Calculate distance between two coordinates in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};