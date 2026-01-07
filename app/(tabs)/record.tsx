import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecordScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = async () => {
    try {
      // Check media library permission
      const mediaLibraryStatus = await MediaLibrary.getPermissionsAsync();
      setMediaLibraryPermission(mediaLibraryStatus.status === 'granted');
      
      setPermissionsChecked(true);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionsChecked(true);
    }
  };

  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  };

  // Show loading while checking permissions
  if (!cameraPermission || !permissionsChecked) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  // Only show permission screen if camera permission is NOT granted
  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#666" />
          <Text style={styles.permissionText}>Camera access is required</Text>
          <Text style={styles.permissionSubtext}>
            We need camera permission to take photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        // Check media library permission
        if (!mediaLibraryPermission) {
          console.log('Media library permission not granted, requesting...');
          const granted = await requestMediaLibraryPermission();
          if (!granted) {
            Alert.alert(
              'Media Library Permission Required',
              'Please enable access to your photo library to save photos',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  onPress: () => takePhotoWithPermissions(false),
                },
              ]
            );
            return;
          }
        }

        takePhotoWithPermissions(true);
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo: ' + (error as Error).message);
      }
    }
  };

  const takePhotoWithPermissions = async (hasMediaLibraryPermission: boolean) => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo && photo.uri) {
          console.log('Photo taken at:', photo.uri);
          await savePhoto(photo.uri, hasMediaLibraryPermission);
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo: ' + (error as Error).message);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const savePhoto = async (uri: string, hasMediaLibraryPermission: boolean) => {
    try {
      const fileName = `photo_${Date.now()}.jpg`;
      
      if (Platform.OS === 'web') {
        // Web: Convert to blob and trigger download
        console.log('Saving photo on web...');
        
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        
        // Also save reference in AsyncStorage for web
        try {
          const savedPhotos = await AsyncStorage.getItem('savedPhotos');
          const photos = savedPhotos ? JSON.parse(savedPhotos) : [];
          photos.push({
            uri: uri,
            fileName: fileName,
            timestamp: Date.now(),
          });
          await AsyncStorage.setItem('savedPhotos', JSON.stringify(photos));
          console.log('Photo reference saved to AsyncStorage');
        } catch (storageError) {
          console.log('AsyncStorage save failed:', storageError);
        }

        await addNewPhotoRecord(uri, fileName);

        Alert.alert(
          'Success',
          'Photo downloaded successfully!',
          [
            {
              text: 'Take Another',
            },
            {
              text: 'Go Back',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Mobile: Save to device photo library
        console.log('Saving photo to device photo library...');
        
        if (hasMediaLibraryPermission) {
          // Save directly to media library
          const asset = await MediaLibrary.createAssetAsync(uri);
          console.log('Photo saved to media library:', asset);
          
          // Also save reference in AsyncStorage
          const savedPhotos = await AsyncStorage.getItem('savedPhotos');
          const photos = savedPhotos ? JSON.parse(savedPhotos) : [];
          photos.push({
            uri: asset.uri,
            fileName: fileName,
            timestamp: Date.now(),
            assetId: asset.id,
          });
          await AsyncStorage.setItem('savedPhotos', JSON.stringify(photos));
          console.log('Photo reference saved to AsyncStorage');

          await addNewPhotoRecord(asset.uri, fileName);

          Alert.alert(
            'Success',
            'Photo saved to your photo library!',
            [
              {
                text: 'Take Another',
              },
              {
                text: 'Go Back',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          // Fallback: Save to app directory
          console.log('Saving photo to app directory (no media library permission)...');
          
          const directory = `${FileSystem.documentDirectory}photos/`;
          
          // Create directory if it doesn't exist
          const dirInfo = await FileSystem.getInfoAsync(directory);
          if (!dirInfo.exists) {
            console.log('Creating photos directory...');
            await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
          }

          const newUri = directory + fileName;
          
          // Copy the file instead of move (more reliable)
          await FileSystem.copyAsync({
            from: uri,
            to: newUri,
          });

          console.log('Photo saved to:', newUri);

          // Save reference in AsyncStorage
          const savedPhotos = await AsyncStorage.getItem('savedPhotos');
          const photos = savedPhotos ? JSON.parse(savedPhotos) : [];
          photos.push({
            uri: newUri,
            fileName: fileName,
            timestamp: Date.now(),
          });
          await AsyncStorage.setItem('savedPhotos', JSON.stringify(photos));
          console.log('Photo reference saved to AsyncStorage');

          await addNewPhotoRecord(newUri, fileName);

          Alert.alert(
            'Limited Success',
            'Photo saved to app storage. To save to your photo library, please grant media library permission.',
            [
              {
                text: 'Take Another',
              },
              {
                text: 'Go Back',
                onPress: () => router.back(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo: ' + (error as Error).message);
    }
  };

  const addNewPhotoRecord = async (uri: string, fileName: string) => {
    try {
      const savedRecords = await AsyncStorage.getItem('sosRecords');
      let records = savedRecords ? JSON.parse(savedRecords) : [];
      
      const newRecord = {
        id: Date.now().toString(),
        circle: 'General',
        title: 'Photo Evidence',
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        media: [{ type: 'photo', uri, filename: fileName }],
        location: null,
        notifiedMembers: [],
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
      };
      
      records.unshift(newRecord);
      await AsyncStorage.setItem('sosRecords', JSON.stringify(records));
      console.log('New photo record added to sosRecords');
    } catch (error) {
      console.error('Error adding photo record:', error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (isCapturing) {
                Alert.alert(
                  'Capturing in Progress',
                  'Wait for photo to finish?',
                  [
                    { text: 'Wait', style: 'cancel' },
                    {
                      text: 'Go Back',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Flip Camera Button */}
          {!isCapturing && (
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        {!isCapturing && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Tap the button to take a photo
            </Text>
            {!mediaLibraryPermission && (
              <View style={styles.warningContainer}>
                <Ionicons name="images-outline" size={16} color="#FFA726" />
                <Text style={styles.warningText}>
                  Photo library access not granted
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isCapturing && styles.recordButtonActive,
            ]}
            onPress={takePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.recordIcon} />
            )}
          </TouchableOpacity>

          {isCapturing && (
            <Text style={styles.recordingText}>Capturing...</Text>
          )}
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
  },
  warningText: {
    color: '#FFA726',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff0000',
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});