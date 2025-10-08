import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useProfile } from '../contexts/ProfileContext';

export default function ChangePictureScreen() {
  const router = useRouter();
  const { profilePicture, updateProfilePicture } = useProfile();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Alternative: Simple colored avatars with initials
  const avatarOptions = [
    { id: 1, color: '#4A90E2', initial: 'JD', name: 'Professional' },
    { id: 2, color: '#FF6B6B', initial: 'SM', name: 'Friendly' },
    { id: 3, color: '#4ECDC4', initial: 'MJ', name: 'Casual' },
    { id: 4, color: '#45B7D1', initial: 'AL', name: 'Elegant' },
    { id: 5, color: '#FFA500', initial: 'TJ', name: 'Creative' },
    { id: 6, color: '#9B59B6', initial: 'EM', name: 'Confident' },
    { id: 7, color: '#34495E', initial: 'RK', name: 'Athletic' },
    { id: 8, color: '#E74C3C', initial: 'LP', name: 'Sophisticated' },
    { id: 9, color: '#2ECC71', initial: 'DW', name: 'Business' },
  ];

  // Also include image options for variety
  const imageOptions = [
    { 
      id: 10, 
      uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 
      name: 'Professional Photo' 
    },
    { 
      id: 11, 
      uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 
      name: 'Friendly Photo' 
    },
  ];

  const handleImageSelect = (imageUri: string) => {
    setSelectedImage(imageUri);
  };

  const handleSave = () => {
    if (selectedImage) {
      // Update the profile picture in context
      updateProfilePicture(selectedImage);
      
      Alert.alert(
        'Success',
        'Profile picture updated successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Please select a picture');
    }
  };

  const handleTakePhoto = () => {
    setShowOptions(false);
    // For demo purposes, we'll use a placeholder
    const demoPhoto = 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face';
    setSelectedImage(demoPhoto);
    Alert.alert('Camera', 'Photo taken and selected!');
  };

  const handleChooseFromGallery = () => {
    setShowOptions(false);
    // For demo purposes, we'll use a placeholder
    const demoPhoto = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face';
    setSelectedImage(demoPhoto);
    Alert.alert('Gallery', 'Photo selected from gallery!');
  };

  const showImagePickerOptions = () => {
    setShowOptions(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Change Profile Picture</Text>
        <Text style={styles.subtitle}>Choose a new photo for your profile</Text>
      </View>

      {/* Current Picture */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Picture</Text>
        <View style={styles.currentImageContainer}>
          <Image 
            source={{ uri: profilePicture }}
            style={styles.currentImage}
          />
        </View>
      </View>

      {/* Avatar Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Avatar</Text>
        <Text style={styles.sectionSubtitle}>Select from our collection</Text>
        
        <View style={styles.avatarGrid}>
          {avatarOptions.map((avatar) => (
            <View key={avatar.id} style={styles.avatarItem}>
              <TouchableOpacity
                style={[
                  styles.avatarOption,
                  selectedImage === avatar.initial && styles.selectedAvatar,
                  { backgroundColor: avatar.color }
                ]}
                onPress={() => handleImageSelect(avatar.initial)}
              >
                <Text style={styles.avatarInitial}>{avatar.initial}</Text>
                {selectedImage === avatar.initial && (
                  <View style={styles.selectedOverlay}>
                    <View style={styles.checkmarkCircle}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarName}>{avatar.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Image Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Options</Text>
        <Text style={styles.sectionSubtitle}>Choose from profile photos</Text>
        
        <View style={styles.imageOptionsContainer}>
          {imageOptions.map((image) => (
            <View key={image.id} style={styles.imageItem}>
              <TouchableOpacity
                style={[
                  styles.imageOption,
                  selectedImage === image.uri && styles.selectedAvatar
                ]}
                onPress={() => handleImageSelect(image.uri)}
              >
                <Image 
                  source={{ uri: image.uri }}
                  style={styles.avatarImage}
                />
                {selectedImage === image.uri && (
                  <View style={styles.selectedOverlay}>
                    <View style={styles.checkmarkCircle}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarName}>{image.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Upload Option */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Your Own</Text>
        
        <TouchableOpacity 
          style={styles.uploadOption}
          onPress={showImagePickerOptions}
        >
          <View style={styles.uploadIcon}>
            <Text style={styles.uploadIconText}>📷</Text>
          </View>
          <View style={styles.uploadTextContainer}>
            <Text style={styles.uploadTitle}>Take Photo or Choose from Gallery</Text>
            <Text style={styles.uploadSubtitle}>Use camera or select from photos</Text>
          </View>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.selectedPreview}>
            <Text style={styles.previewTitle}>Selected Picture Preview</Text>
            <View style={styles.previewContainer}>
              {selectedImage.includes('http') ? (
                <Image 
                  source={{ uri: selectedImage }}
                  style={styles.selectedPreviewImage}
                />
              ) : (
                <View style={[styles.selectedPreviewImage, { backgroundColor: '#4A90E2', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.previewInitial}>{selectedImage}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.saveButton,
            !selectedImage && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!selectedImage}
        >
          <Text style={styles.saveButtonText}>Save Picture</Text>
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
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleTakePhoto}
            >
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleChooseFromGallery}
            >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  currentImageContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  currentImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  avatarItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  selectedAvatar: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.05 }],
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadIconText: {
    fontSize: 20,
    color: '#fff',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  selectedPreview: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewContainer: {
    alignItems: 'center',
  },
  selectedPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  previewInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ff4444',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: '500',
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
});