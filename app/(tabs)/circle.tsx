import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FirebaseService, CircleMember, CircleCategory, UserProfile } from '../auth/firebaseService'; // Import the service
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// Add this helper function to your utilities file or at the top of your component
export function normalizePhoneNumber(phoneNumber: string): string {
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

export function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  return normalizePhoneNumber(phone1) === normalizePhoneNumber(phone2);
}

export default function MyCircleScreen() {
  const [circles, setCircles] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CircleCategory | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        setCurrentUserId(user.uid);
        setAuthLoading(false);
      } else {
        console.log('No user authenticated');
        setCurrentUserId(null);
        setAuthLoading(false);
        Alert.alert('Authentication Required', 'Please log in to view your circles');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadCircles();
    }
  }, [currentUserId]);

  // In MyCircleScreen.tsx, add this useEffect after the existing ones
// In MyCircleScreen.tsx, update the real-time listener useEffect
useEffect(() => {
  if (!currentUserId) return;

  console.log('[CIRCLES LISTENER] Setting up real-time listener for user:', currentUserId);
  
  // Set up real-time listener for circle changes
  const circlesRef = collection(db, 'users', currentUserId, 'circles');
  const unsubscribe = onSnapshot(circlesRef, (snapshot) => {
    const updatedCircles: CircleMember[] = [];
    
    snapshot.docChanges().forEach((change) => {
      console.log(`[CIRCLES LISTENER] Document change: ${change.type} for doc ${change.doc.id}`);
    });
    
    snapshot.forEach((doc) => {
      const memberData = doc.data();
      updatedCircles.push({
        id: doc.id,
        ...memberData,
      } as CircleMember);
    });
    
    console.log(`[CIRCLES LISTENER] Updated circles: ${updatedCircles.length} members`);
    console.log('[CIRCLES LISTENER] Circle members:', updatedCircles.map(m => ({ id: m.id, name: m.name, status: m.status })));
    
    // Check for duplicates before setting state
    const uniqueCircles = updatedCircles.filter((circle, index, self) =>
      index === self.findIndex(c => c.id === circle.id)
    );
    
    if (uniqueCircles.length !== updatedCircles.length) {
      console.warn('[CIRCLES LISTENER] Found duplicate circle members, removing duplicates');
    }
    
    setCircles(uniqueCircles);
  }, (error) => {
    console.error('[CIRCLES LISTENER] Error listening to circles:', error);
  });

  return () => {
    console.log('[CIRCLES LISTENER] Unsubscribing from circles listener');
    unsubscribe();
  };
}, [currentUserId]);

  async function loadCircles() {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to view circles');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await FirebaseService.fetchUserCircles(currentUserId);
      console.log(`Loaded ${data.length} circles for user ${currentUserId}`);
      setCircles(data);
    } catch (error) {
      console.error('Failed to load circles:', error);
      Alert.alert('Error', 'Failed to load your circles');
    } finally {
      setLoading(false);
    }
  }

// Update handleRemoveMember
  const handleRemoveMember = async (memberId: string) => {
    if (!currentUserId) return;
  
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from your circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await FirebaseService.removeCircleMember(currentUserId, memberId);
              Alert.alert('Success', 'Member removed from circle');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  function handleCallMember(member: CircleMember) {
    const phoneNumber = member.mobileNumber.replace(/\s+/g, '');
    const url = `tel:${phoneNumber}`;
  
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', `Cannot make calls to ${phoneNumber}`);
        }
      })
      .catch((err) => {
        console.error('Error initiating call:', err);
        Alert.alert('Error', 'Failed to initiate call');
      });
  }
  
  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </View>
    );
  }

  if (!currentUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Authentication Required</Text>
          <Text style={styles.emptySubtitle}>Please log in to access your circles</Text>
        </View>
      </View>
    );
  }

  

  const groupedCircles = circles.reduce((acc, member) => {
    if (!acc[member.category]) acc[member.category] = [];
    acc[member.category].push(member);
    return acc;
  }, {} as Record<CircleCategory, CircleMember[]>);

  const categories: CircleCategory[] = ['Sibling', 'Friends', 'Family', 'Emergency', 'Other'];

  if (selectedCategory) {
    const members = groupedCircles[selectedCategory] || [];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{selectedCategory}</Text>
            <Text style={styles.headerSubtitle}>{members.length} members</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {members.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No members yet</Text>
              <Text style={styles.emptySubtitle}>Add members to this circle</Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {members.map((member) => (
  <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    {member.profilePictureBase64 ? (
                      <Image
                        source={{ uri: member.profilePictureBase64 }}
                        style={styles.memberImage}
                      />
                    ) : (
                      <View style={styles.memberImagePlaceholder}>
                        <Text style={styles.memberImageText}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberPhone}>{member.mobileNumber}</Text>
                      <View style={styles.memberStatusRow}>
                        {member.isRegistered && (
                          <View style={styles.registeredBadge}>
                            <Text style={styles.registeredText}>Registered</Text>
                          </View>
                        )}
                        {/* NEW: Show invitation status */}
                        {member.status === 'pending' && (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>Pending</Text>
                          </View>
                        )}
                        {member.status === 'accepted' && (
                          <View style={styles.acceptedBadge}>
                            <Text style={styles.acceptedText}>Accepted</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.callButtonSmall}
                      onPress={() => handleCallMember(member)}
                    >
                      <Ionicons name="call" size={28} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMember(member.id)}
                    >
                      <Ionicons name="trash-outline" size={28} color="#333" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        
<AddMemberModal
  visible={showAddModal}
  onClose={() => setShowAddModal(false)}
  currentUserId={currentUserId}
  //Update the modal's onAdd function
  onAdd={async (member, invitedUserData) => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      await FirebaseService.addCircleMember(
        currentUserId,
        member,
        invitedUserData
      );
      setShowAddModal(false);
      Alert.alert('Success', 'Member added to circle');
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setLoading(false);
    }
  }}
/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Circle</Text>
          <Text style={styles.headerSubtitle}>{circles.length} total members</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          
        <Ionicons name={"people-outline"} size={28} />
       
        </TouchableOpacity>
      </View>

      {loading && (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
)}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading circles...</Text>
          </View>
        ) : circles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No circle members yet</Text>
            <Text style={styles.emptySubtitle}>Add your first member to get started</Text>
          </View>
        ) : (
          <View style={styles.circlesContainer}>
            {categories.map(category => {
              const members = groupedCircles[category] || [];
              if (members.length === 0) return null;

              return (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryCard}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <View>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      <Text style={styles.categorySubtitle}>
                        {members.length} {members.length === 1 ? 'Member' : 'Members'}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  <View style={styles.membersRow}>
                    {members.slice(0, 5).map((member, index) => (
                      <View
                        key={member.id}
                        style={[styles.memberAvatar, index > 0 && styles.memberAvatarOverlap]}
                      >
                        {member.profilePictureBase64 ? (
                          <Image
                            source={{ uri: member.profilePictureBase64 }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                              {member.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                    
                    {members.length > 5 && (
                      <View style={[styles.memberAvatar, styles.countBadge]}>
                        <Text style={styles.countText}>+{members.length - 5}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>


    
     
<AddMemberModal
  visible={showAddModal}
  onClose={() => setShowAddModal(false)}
  currentUserId={currentUserId}
  //Update the modal's onAdd function
  onAdd={async (member, invitedUserData) => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      await FirebaseService.addCircleMember(
        currentUserId,
        member,
        invitedUserData
      );
      setShowAddModal(false);
      Alert.alert('Success', 'Member added to circle');
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setLoading(false);
    }
  }}
/>
    </View>
  );
}

// Add Member Modal Component - UPDATED
function AddMemberModal({
  visible,
  onClose,
  onAdd,
  defaultCategory,
  currentUserId,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (member: Omit<CircleMember, 'id' | 'addedAt'>, invitedUserData?: UserProfile | null) => Promise<void>;
  defaultCategory?: CircleCategory;
  currentUserId: string;
}){
  const [mobileNumber, setMobileNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CircleCategory>(defaultCategory || 'Friends');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory]);

// Replace your handleSearchUser function with this:
async function handleSearchUser() {
  if (!mobileNumber.trim()) return;
  
  setSearching(true);
  try {
    console.log("[DEBUG] handleSearchUser called with mobileNumber:", mobileNumber);
    
    // Normalize the search input
    const normalizedSearchNumber = normalizePhoneNumber(mobileNumber);
    console.log("[DEBUG] Normalized search number:", normalizedSearchNumber);
    
    // Search users collection directly
    const user = await FirebaseService.findUserByMobile(mobileNumber);
    console.log("[DEBUG] findUserByMobile result:", user ? JSON.stringify(user) : "null");
    
    // If not found with original number, try normalizing the database number too
    if (!user) {
      // This requires modifying FirebaseService to return all users and filter client-side
      // OR modify the backend query. For now, we normalize and search again
      const allUsers = await FirebaseService.getAllUsers(); // You may need to add this method
      
      const matchedUser = allUsers?.find(u => 
        phoneNumbersMatch(u.mobileNumber, mobileNumber)
      );
      
      if (matchedUser) {
        setFoundUser(matchedUser);
        setName(matchedUser.name);
        if (matchedUser.profilePictureBase64) {
          setProfileImage(matchedUser.profilePictureBase64);
        }
        console.log("[DEBUG] User found with normalized number");
        return;
      }
    }
    
    setFoundUser(user);
    if (user) {
      setName(user.name);
      if (user.profilePictureBase64) {
        setProfileImage(user.profilePictureBase64);
      }
      console.log("[DEBUG] User found and data set");
    } else {
      setName(''); // Reset name if user not found
      Alert.alert('User Not Found', 'This user is not registered yet');
      console.log("[DEBUG] User not found");
    }
  } catch (error) {
    console.error('Error searching user:', error);
    Alert.alert('Error', 'Failed to search user');
  } finally {
    setSearching(false);
  }
}

  async function handlePickImage() {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfileImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }

// In AddMemberModal's handleSubmit function
async function handleSubmit() {
  if (!mobileNumber.trim() || !name.trim()) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  setSaving(true);
  try {
    // Explicitly type the memberData object with the correct status type
    const memberData: Omit<CircleMember, 'id' | 'addedAt'> = {
      mobileNumber: mobileNumber.trim(),
      name: name.trim(),
      category,
      profilePictureBase64: profileImage || foundUser?.profilePictureBase64,
      isRegistered: !!foundUser,
      status: 'pending' as const, // Explicitly set to 'pending' with const assertion
      invitedBy: currentUserId,
    };
    
    // Check if onAdd accepts one or two parameters
    if (onAdd.length === 1) {
      // onAdd only accepts one parameter
      await onAdd(memberData);
    } else {
      // onAdd accepts two parameters
      await onAdd(memberData, foundUser);
    }

    // Reset form
    setMobileNumber('');
    setName('');
    setFoundUser(null);
    setProfileImage(null);
    setCategory(defaultCategory || 'Friends');
  } catch (error) {
    console.error("[DEBUG] Error in handleSubmit:", error);
    Alert.alert('Error', 'Failed to add member');
  } finally {
    setSaving(false);
  }
}
  
// Add this function to MyCircleScreen.tsx
async function testNotificationCreation() {
  if (!currentUserId) return;
  
  try {
    console.log("[TEST] Starting notification creation test");
    
    // Get a test user (you can hardcode a real user ID here)
    const testUserId = "REAL_USER_ID_HERE"; // Replace with a real user ID
    
    // Create a test notification
    const notificationsRef = collection(db, 'users', testUserId, 'notifications');
    const testNotification = {
      type: 'circle_invitation',
      fromUserId: currentUserId,
      fromUserName: 'Test User',
      fromUserPhone: '1234567890',
      category: 'Friends' as CircleCategory,
      status: 'pending' as const,
      createdAt: Timestamp.now(),
      message: 'Test invitation message',
    };
    
    const docRef = await addDoc(notificationsRef, testNotification);
    console.log("[TEST] Notification created successfully with ID:", docRef.id);
    Alert.alert("Success", "Test notification created successfully");
  } catch (error) {
    console.error("[TEST ERROR] Failed to create test notification:", error);
    Alert.alert("Error", "Failed to create test notification");
  }
}



  const categories: CircleCategory[] = ['Sibling', 'Friends', 'Family', 'Emergency', 'Other'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Circle Member</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Picture</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={handlePickImage}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Text style={styles.imagePickerIcon}>📷</Text>
                    <Text style={styles.imagePickerText}>Tap to select photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneInputRow}>
                <TextInput
                  style={styles.phoneInput}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="0962380867"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
                  onPress={handleSearchUser}
                  disabled={searching}
                >
                  <Text style={styles.searchBtnText}>
                    {searching ? 'Searching...' : 'Search'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {foundUser && (
                <View style={styles.foundUserCard}>
                  <View style={styles.foundUserAvatar}>
                    {foundUser.profilePictureBase64 ? (
                      <Image source={{ uri: foundUser.profilePictureBase64 }} style={styles.foundUserImage} />
                    ) : (
                      <Text style={styles.foundUserText}>{foundUser.name.charAt(0)}</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.foundUserName}>{foundUser.name}</Text>
                    <Text style={styles.foundUserStatus}>Registered user found</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={styles.submitButtonText}>
                {saving ? 'Adding...' : 'Add Member'}
              </Text>
            </TouchableOpacity>

            


          </View>
        </View>
      </View>
    </Modal>
  );
}

// NEW STYLES for status badges
const statusBadgeStyles = {
  memberStatusRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pendingText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  acceptedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#3B82F6',
  },
  placeholder: {
    width: 40,
  },
  searchButton: {
    padding: 8,
  },
  searchIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  // Add to styles
loadingOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
},
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  circlesContainer: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 32,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberAvatarOverlap: {
    marginLeft: -12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  memberImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberImageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  memberStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  registeredBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  registeredText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pendingText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  acceptedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callButtonSmall: {
    width: 40,
    height: 40,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconSmall: {
    fontSize: 18,
  },
  removeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  imagePickerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
  },
  foundUserCard: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foundUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  foundUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  foundUserText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  foundUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  foundUserStatus: {
    fontSize: 12,
    color: '#059669',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});