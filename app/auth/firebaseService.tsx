// FirebaseService.ts - COMPLETE with phone normalization

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';

export type CircleCategory = 'Sibling' | 'Friends' | 'Family' | 'Emergency' | 'Other';

export type CircleMember = {
  id: string;
  mobileNumber: string;
  name: string;
  category: CircleCategory;
  profilePictureBase64?: string;
  isRegistered: boolean;
  addedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  invitedBy?: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  mobileNumber?: string;
  photoURL?: string;
  profilePictureBase64?: string;
};

export type Notification = {
  id: string;
  type: 'circle_invitation';
  fromUserId: string;
  fromUserName: string;
  fromUserPhone: string;
  fromUserProfilePicture?: string;
  category: CircleCategory;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any; // Timestamp
  message: string;
  circleMemberId?: string; // ID of the circle member in inviter's collection
};

export class FirebaseService {
  // Helper function to normalize phone numbers
  static normalizePhoneNumber(phoneNumber: string | undefined): string {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove country code if present (260 for Zambia)
    if (cleaned.startsWith('260')) {
      cleaned = cleaned.slice(3);
    }
    
    // Ensure it starts with 0
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    
    return cleaned;
  }

  static getCurrentUserId(): string | null {
    const auth = getAuth();
    return auth.currentUser?.uid || null;
  }

  static async fetchUserCircles(userId: string): Promise<CircleMember[]> {
    try {
      const circlesRef = collection(db, 'users', userId, 'circles');
      const snapshot = await getDocs(circlesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CircleMember[];
    } catch (error) {
      console.error('Error fetching circles:', error);
      throw error;
    }
  }

  // Search main users collection by mobile number with normalization
  static async findUserByMobile(mobileNumber: string): Promise<UserProfile | null> {
    try {
      const normalizedSearchNumber = this.normalizePhoneNumber(mobileNumber);
      console.log("[DEBUG] findUserByMobile - normalized search number:", normalizedSearchNumber);
      
      // First try exact match
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobileNumber', '==', mobileNumber));
      let snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return {
          uid: snapshot.docs[0].id,
          name: userData.name || '',
          email: userData.email || '',
          mobileNumber: userData.mobileNumber,
          photoURL: userData.photoURL,
          profilePictureBase64: userData.profilePictureBase64,
        };
      }
      
      // If not found, get all users and normalize their numbers
      const allUsersSnapshot = await getDocs(usersRef);
      
      for (const doc of allUsersSnapshot.docs) {
        const userData = doc.data();
        const normalizedDbNumber = this.normalizePhoneNumber(userData.mobileNumber || '');
        
        if (normalizedDbNumber === normalizedSearchNumber) {
          console.log("[DEBUG] Found user with normalized number match");
          return {
            uid: doc.id,
            name: userData.name || '',
            email: userData.email || '',
            mobileNumber: userData.mobileNumber,
            photoURL: userData.photoURL,
            profilePictureBase64: userData.profilePictureBase64,
          };
        }
      }
      
      console.log("[DEBUG] No user found even after normalization");
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  // New method to get all users
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      return snapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          uid: doc.id,
          name: userData.name || '',
          email: userData.email || '',
          mobileNumber: userData.mobileNumber,
          photoURL: userData.photoURL,
          profilePictureBase64: userData.profilePictureBase64,
        };
      });
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // Check if user already exists in current user's circle with normalization
  static async isUserInCircle(userId: string, mobileNumber: string): Promise<boolean> {
    try {
      const normalizedSearchNumber = this.normalizePhoneNumber(mobileNumber);
      const circlesRef = collection(db, 'users', userId, 'circles');
      const snapshot = await getDocs(circlesRef);
      
      for (const doc of snapshot.docs) {
        const memberData = doc.data();
        const normalizedMemberNumber = this.normalizePhoneNumber(memberData.mobileNumber || '');
        
        if (normalizedMemberNumber === normalizedSearchNumber) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking circle membership:', error);
      return false;
    }
  }

  static async addCircleMember(
    userId: string,
    member: Omit<CircleMember, 'id' | 'addedAt'>,
    invitedUserData?: UserProfile | null
  ): Promise<CircleMember> {
    try {
      console.log("[DEBUG] addCircleMember called with:");
      console.log("[DEBUG] userId:", userId);
      console.log("[DEBUG] member.mobileNumber:", member.mobileNumber);
      console.log("[DEBUG] member.name:", member.name);
      console.log("[DEBUG] member.isRegistered:", member.isRegistered);
      console.log("[DEBUG] invitedUserData:", invitedUserData ? JSON.stringify(invitedUserData) : "null");
      
      // First check if user already exists in circle
      const alreadyInCircle = await this.isUserInCircle(userId, member.mobileNumber);
      if (alreadyInCircle) {
        throw new Error('User is already in your circle');
      }

      const circlesRef = collection(db, 'users', userId, 'circles');
      
      const memberData: any = {
        mobileNumber: member.mobileNumber,
        name: member.name,
        category: member.category,
        isRegistered: member.isRegistered,
        status: member.status || 'pending',
        invitedBy: userId,
        addedAt: Timestamp.now(),
      };
      
      if (member.profilePictureBase64) {
        memberData.profilePictureBase64 = member.profilePictureBase64;
      }
      
      const docRef = await addDoc(circlesRef, memberData);
      console.log("[DEBUG] Circle member document created with ID:", docRef.id);

      // Send notification to invited user if they're registered
      if (invitedUserData && member.isRegistered) {
        console.log("[DEBUG] About to send invitation to:", invitedUserData.uid);
        console.log("[DEBUG] Circle member ID to pass:", docRef.id);
        
        try {
          await this.sendCircleInvitation(
            userId,
            invitedUserData.uid,
            member,
            invitedUserData,
            docRef.id
          );
          console.log("[DEBUG] Invitation sent successfully");
        } catch (notificationError) {
          console.error("[DEBUG] Error sending invitation:", notificationError);
        }
      } else {
        console.log("[DEBUG] Not sending notification because:");
        console.log("[DEBUG] invitedUserData is null:", !invitedUserData);
        console.log("[DEBUG] member.isRegistered is false:", !member.isRegistered);
      }
      
      return {
        id: docRef.id,
        mobileNumber: member.mobileNumber,
        name: member.name,
        category: member.category,
        profilePictureBase64: member.profilePictureBase64,
        isRegistered: member.isRegistered,
        status: member.status || 'pending',
        invitedBy: userId,
        addedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  static async sendCircleInvitation(
    fromUserId: string,
    toUserId: string,
    member: Omit<CircleMember, 'id' | 'addedAt'>,
    invitedUser: UserProfile,
    circleMemberId: string
  ): Promise<void> {
    try {
      console.log(`[DEBUG] sendCircleInvitation called with:`);
      console.log(`[DEBUG] fromUserId: ${fromUserId}`);
      console.log(`[DEBUG] toUserId: ${toUserId}`);
      console.log(`[DEBUG] circleMemberId: ${circleMemberId}`);
      
      const userDocRef = doc(db, 'users', fromUserId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.error('[DEBUG ERROR] No user found with ID:', fromUserId);
        throw new Error('Inviter not found');
      }
      
      const currentUserData = userDocSnap.data();
      console.log('[DEBUG] Current user data retrieved:', currentUserData?.name);

      const notificationsRef = collection(db, 'users', toUserId, 'notifications');
      console.log('[DEBUG] Notifications reference path:', notificationsRef.path);

      const notificationData: any = {
        type: 'circle_invitation',
        fromUserId,
        fromUserName: currentUserData?.name || 'Unknown User',
        fromUserPhone: currentUserData?.mobileNumber || '',
        category: member.category,
        status: 'pending',
        createdAt: Timestamp.now(),
        message: `${currentUserData?.name || 'A user'} invited you to their ${member.category} circle`,
        circleMemberId,
      };

      if (currentUserData?.profilePictureBase64) {
        notificationData.fromUserProfilePicture = currentUserData.profilePictureBase64 || null; 
        console.log('[DEBUG] Including fromUserProfilePicture in notification');
      } else {
        console.log('[DEBUG] fromUserProfilePicture is undefined, omitting from notification');
      }

      console.log('[DEBUG] Creating notification document with data:', {
        fromUserName: notificationData.fromUserName,
        fromUserPhone: notificationData.fromUserPhone,
        category: notificationData.category,
        toUserId,
        hasProfilePicture: !!notificationData.fromUserProfilePicture,
      });

      const docRef = await addDoc(notificationsRef, notificationData);
      console.log('✓✓✓ NOTIFICATION CREATED SUCCESSFULLY ✓✓✓');
      console.log('[DEBUG] Document ID:', docRef.id);
      console.log('[DEBUG] For user:', toUserId);
      console.log('[DEBUG] From user:', fromUserId);
    } catch (error) {
      console.error('✗✗✗ ERROR CREATING NOTIFICATION ✗✗✗');
      console.error('[DEBUG ERROR] Error details:', error);
      console.error('[DEBUG ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      throw error;
    }
  }

  static async createMutualConnection(
    inviterId: string,
    inviterName: string,
    inviterPhone: string,
    recipientId: string,
    category: CircleCategory,
    inviterProfilePic?: string
  ): Promise<void> {
    try {
      console.log(`[MUTUAL CONNECTION] Creating connection between ${inviterId} (inviter) and ${recipientId} (recipient)`);
      
      const inviterInCircle = await this.isUserInCircle(recipientId, inviterPhone);
      console.log(`[MUTUAL CONNECTION] Inviter already in recipient's circle: ${inviterInCircle}`);
      
      if (inviterInCircle) {
        console.log('[MUTUAL CONNECTION] Inviter already in recipient circle, updating status');
        const existingMember = await this.findCircleMemberByMobile(recipientId, inviterPhone);
        if (existingMember) {
          await this.updateCircleMember(recipientId, existingMember.id, { status: 'accepted' });
          console.log('✓ Updated existing connection to accepted');
        }
      } else {
        console.log('[MUTUAL CONNECTION] Adding inviter to recipient circle');
        const newMember = await this.addCircleMemberWithoutNotification(recipientId, {
          mobileNumber: inviterPhone,
          name: inviterName,
          category,
          profilePictureBase64: inviterProfilePic,
          isRegistered: true,
          status: 'accepted',
          invitedBy: recipientId,
        });
        console.log('✓ Added new mutual connection with ID:', newMember.id);
      }
      
      console.log('✓ Mutual connection created successfully');
    } catch (error) {
      console.error('✗ Error creating mutual connection:', error);
      throw error;
    }
  }
  
  static async findCircleMemberByMobile(
    userId: string,
    mobileNumber: string
  ): Promise<CircleMember | null> {
    try {
      const normalizedSearchNumber = this.normalizePhoneNumber(mobileNumber);
      const circlesRef = collection(db, 'users', userId, 'circles');
      const snapshot = await getDocs(circlesRef);
      
      for (const doc of snapshot.docs) {
        const memberData = doc.data();
        const normalizedMemberNumber = this.normalizePhoneNumber(memberData.mobileNumber || '');
        
        if (normalizedMemberNumber === normalizedSearchNumber) {
          return {
            id: doc.id,
            ...memberData,
          } as CircleMember;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding circle member by mobile:', error);
      return null;
    }
  }

  static async addCircleMemberWithoutNotification(
    userId: string,
    member: Omit<CircleMember, 'id' | 'addedAt'>
  ): Promise<CircleMember> {
    try {
      console.log(`[ADD MEMBER WITHOUT NOTIF] Adding member to user ${userId}:`, member.name);
      
      const circlesRef = collection(db, 'users', userId, 'circles');
      console.log(`[ADD MEMBER WITHOUT NOTIF] Circles collection path:`, circlesRef.path);
      
      const memberData: any = {
        mobileNumber: member.mobileNumber,
        name: member.name,
        category: member.category,
        isRegistered: member.isRegistered,
        status: member.status || 'pending',
        invitedBy: member.invitedBy || userId,
        addedAt: Timestamp.now(),
      };
      
      if (member.profilePictureBase64) {
        memberData.profilePictureBase64 = member.profilePictureBase64;
      }
      
      const docRef = await addDoc(circlesRef, memberData);
      console.log(`[ADD MEMBER WITHOUT NOTIF] Created circle member with ID:`, docRef.id);
      
      return {
        id: docRef.id,
        mobileNumber: member.mobileNumber,
        name: member.name,
        category: member.category,
        profilePictureBase64: member.profilePictureBase64,
        isRegistered: member.isRegistered,
        status: member.status || 'pending',
        invitedBy: member.invitedBy || userId,
        addedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ADD MEMBER WITHOUT NOTIF ERROR] Error adding member:', error);
      throw error;
    }
  }

  static async updateCircleMember(
    userId: string,
    memberId: string,
    updates: Partial<CircleMember>
  ): Promise<void> {
    try {
      const memberRef = doc(db, 'users', userId, 'circles', memberId);
      await updateDoc(memberRef, updates);
      console.log(`✓ Updated circle member ${memberId} for user ${userId}`);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  static async removeCircleMember(userId: string, memberId: string): Promise<void> {
    try {
      const memberRef = doc(db, 'users', userId, 'circles', memberId);
      await deleteDoc(memberRef);
      console.log(`✓ Removed circle member ${memberId} for user ${userId}`);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  static async getUserData(userId: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) return null;
      
      const userData = userSnap.data();
      return {
        uid: userId,
        name: userData.name || '',
        email: userData.email || '',
        mobileNumber: userData.mobileNumber,
        photoURL: userData.photoURL,
        profilePictureBase64: userData.profilePictureBase64,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
}