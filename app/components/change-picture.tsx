import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera } from 'expo-camera';
import { auth, db } from '../../firebaseConfig';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../contexts/ProfileContext';
import * as ImageManipulator from 'expo-image-manipulator';


const { width, height } = Dimensions.get('window');

export default function ProfileManagementScreen() {
  const router = useRouter();
  const { updateProfilePicture, updateProfileName } = useProfile();
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // User data
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  
  // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempMobile, setTempMobile] = useState('');


  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || '');
        setMobileNumber(data.mobileNumber || '');
        setEmail(data.email || user.email || '');
        
        // Just use the data as-is from Firestore
        const profilePic = data.profilePictureBase64 || 'https://i.pravatar.cc/150?img=10';
        
        setProfilePicture(profilePic);
        updateProfilePicture(profilePic);
        setTempName(data.name || '');
        setTempMobile(data.mobileNumber || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

const convertImageToBase64 = async (uri: string): Promise<string> => {
  try {
    console.log('Converting image from URI:', uri);
    
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64data = reader.result as string;
          console.log('Web base64 length:', base64data.length);
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Mobile: Read the file
      console.log('Reading mobile file...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('Mobile base64 length:', base64.length);
      
      // Detect image type from URI or default to jpeg
      let mimeType = 'image/jpeg';
      if (uri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (uri.toLowerCase().includes('.jpg') || uri.toLowerCase().includes('.jpeg')) {
        mimeType = 'image/jpeg';
      }
      
      const dataUri = `data:${mimeType};base64,${base64}`;
      console.log('Created data URI with type:', mimeType);
      return dataUri;
    }
  } catch (error) {
    console.error('Error converting to base64:', error);
    throw error;
  }
};

  const handleTakePhoto = async () => {
    setShowOptions(false);
    
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, // We'll handle cropping ourselves
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowCropModal(true);
    }
  };

  const handleChooseFromGallery = async () => {
    setShowOptions(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // We'll handle cropping ourselves
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowCropModal(true);
    }
  };

const handleCropAndUpload = async () => {
  if (!selectedImage) return;

  try {
    setLoading(true);
    setShowCropModal(false);

    console.log('Starting crop process...');
    console.log('Selected image URI:', selectedImage);

    // Crop and resize the image
    const manipResult = await ImageManipulator.manipulateAsync(
      selectedImage,
      [
        { resize: { width: 400 } }, // Resize to reasonable size
      ],
      { 
        compress: 0.7, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );

    console.log('Image manipulated successfully');
    console.log('Manipulated URI:', manipResult.uri);
    console.log('Image dimensions:', manipResult.width, 'x', manipResult.height);

    await uploadProfilePicture(manipResult.uri);
    setSelectedImage(null);
  } catch (error: any) {
    console.error('Error cropping image:', error);
    console.error('Crop error details:', {
      message: error.message,
      selectedImage
    });
    Alert.alert('Error', `Failed to process image: ${error.message}`);
    setLoading(false);
  }
};

const uploadProfilePicture = async (imageUri: string) => {
  try {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    console.log('Starting upload process...');
    console.log('Original URI:', imageUri);

    // Convert to base64 WITH the data URI prefix
    const base64ImageWithPrefix = await convertImageToBase64(imageUri);
    
    console.log('Base64 conversion complete');
    console.log('Data URI prefix:', base64ImageWithPrefix.substring(0, 50));

    // Validate the base64 string
    if (!base64ImageWithPrefix.startsWith('data:image/')) {
      throw new Error('Invalid image format');
    }

    // Update Firestore with the FULL data URI (including prefix)
    const userRef = doc(db, 'users', user.uid);
    
    console.log('Updating Firestore...');
    await updateDoc(userRef, {
      profilePictureBase64: base64ImageWithPrefix,
      updatedAt: new Date(),
    });

    console.log('Firestore update complete');

    // Update local state and context
    setProfilePicture(base64ImageWithPrefix);
    updateProfilePicture(base64ImageWithPrefix);
    
    Alert.alert('Success', 'Profile picture updated successfully!');
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    Alert.alert('Error', `Failed to update profile picture: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleRemoveProfilePicture = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;
              if (!user) return;

              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                profilePictureBase64: null,
                updatedAt: new Date(),
              });

              // Update local state and context
              setProfilePicture(null);
              updateProfilePicture('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face');
              
              Alert.alert('Success', 'Profile picture removed successfully!');
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Alert.alert('Error', 'Failed to remove profile picture');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: tempName.trim(),
        updatedAt: new Date(),
      });

      setName(tempName.trim());
      updateProfileName(tempName.trim());
      setIsEditingName(false);
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMobile = async () => {
    if (!tempMobile.trim()) {
      Alert.alert('Error', 'Mobile number cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        mobileNumber: tempMobile.trim(),
        updatedAt: new Date(),
      });

      setMobileNumber(tempMobile.trim());
      setIsEditingMobile(false);
      Alert.alert('Success', 'Mobile number updated successfully!');
    } catch (error) {
      console.error('Error updating mobile:', error);
      Alert.alert('Error', 'Failed to update mobile number');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

const handleLocationUpdate = async () => {
   try{
	router.replace('/auth/location-setup');
   } catch (error:any) {
   console.error('Error loading page: ', error);
}
};

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));

      // Delete authentication account
      await deleteUser(user);

      setShowDeleteModal(false);
      Alert.alert('Account Deleted', 'Your account has been permanently deleted', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Re-authentication Required',
          'For security reasons, please sign out and sign in again before deleting your account'
        );
      } else {
        Alert.alert('Error', 'Failed to delete account');
      }
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff4444" />
        </View>
      )}

      {/* Profile Picture Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <View style={styles.profilePictureContainer}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="person" size={60} color="#999" />
            </View>
          )}
          <TouchableOpacity
            style={styles.changePictureButton}
            onPress={() => setShowOptions(true)}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {profilePicture && (
          <TouchableOpacity
            style={styles.removePictureButton}
            onPress={handleRemoveProfilePicture}
          >
            <Ionicons name="trash-outline" size={16} color="#ff4444" />
            <Text style={styles.removePictureText}>Remove Picture</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Name Section */}
      <View style={styles.section}>
        <View style={styles.fieldHeader}>
          <Text style={styles.sectionTitle}>Full Name</Text>
          {!isEditingName && (
            <TouchableOpacity onPress={() => {
              setIsEditingName(true);
              setTempName(name);
            }}>
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        {isEditingName ? (
          <View>
            <TextInput
              style={styles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditingName(false);
                  setTempName(name);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.fieldValue}>{name || 'Not set'}</Text>
        )}
      </View>

      {/* Mobile Number Section */}
      <View style={styles.section}>
        <View style={styles.fieldHeader}>
          <Text style={styles.sectionTitle}>Mobile Number</Text>
          {!isEditingMobile && (
            <TouchableOpacity onPress={() => {
              setIsEditingMobile(true);
              setTempMobile(mobileNumber);
            }}>
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        {isEditingMobile ? (
          <View>
            <TextInput
              style={styles.input}
              value={tempMobile}
              onChangeText={setTempMobile}
              placeholder="Enter your mobile number"
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditingMobile(false);
                  setTempMobile(mobileNumber);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveMobile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.fieldValue}>{mobileNumber || 'Not set'}</Text>
        )}
      </View>

      {/* Email Section (Read-only) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <Text style={styles.fieldValue}>{email}</Text>
        <Text style={styles.fieldNote}>Email cannot be changed</Text>
      </View>

      {/* Location Updates */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleLocationUpdate}
        >
          <Ionicons name="location-outline" size={24} color="#ff4444" />
          <Text style={styles.deleteButtonText}> Update Location </Text>
        </TouchableOpacity>
      </View>


      {/* Account Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Image Picker Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Option</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleChooseFromGallery}
            >
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Crop/Preview Modal */}
      <Modal
        visible={showCropModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCropModal(false);
          setSelectedImage(null);
        }}
      >
        <View style={styles.cropModalOverlay}>
          <View style={styles.cropModalContent}>
            <Text style={styles.cropModalTitle}>Adjust Your Photo</Text>
            
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              </View>
            )}

            <Text style={styles.cropModalHint}>
              Your photo will be automatically cropped to fit
            </Text>

            <View style={styles.cropModalButtons}>
              <TouchableOpacity
                style={styles.cropCancelButton}
                onPress={() => {
                  setShowCropModal(false);
                  setSelectedImage(null);
                }}
              >
                <Text style={styles.cropCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropConfirmButton}
                onPress={handleCropAndUpload}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.cropConfirmText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="warning" size={60} color="#ff4444" />
            <Text style={styles.deleteModalTitle}>Delete Account?</Text>
            <Text style={styles.deleteModalText}>
              This will permanently delete your account and all associated data. This
              action cannot be undone.
            </Text>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  profilePictureContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  removePictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
    width: '100%',
  },
  removePictureText: {
    color: '#ff4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldValue: {
    fontSize: 16,
    color: '#666',
  },
  fieldNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 30,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 12,
  },
  modalCancel: {
    padding: 16,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
  },
  cropModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cropModalContent: {
    width: Math.min(width - 40, 400),
    maxHeight: height * 0.85, // Limit to 85% of screen height
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cropModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    width: Math.min(width - 120, 280), // Smaller, responsive size
    height: Math.min(width - 120, 280),
    borderRadius: Math.min(width - 120, 280) / 2,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  cropModalHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  cropModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cropCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cropCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  cropConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cropConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteModalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ff4444',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});