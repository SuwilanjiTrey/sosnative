import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@app_settings';

export default function SettingsScreen() {
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [backgroundLocationEnabled, setBackgroundLocationEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [photoEnabled, setPhotoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissionStates();
  }, []);

  const loadPermissionStates = async () => {
    try {
      // Check actual permission statuses
      const [locationStatus, backgroundStatus, cameraStatus, audioStatus, photoStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        Audio.getPermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
      ]);

      setLocationEnabled(locationStatus.status === 'granted');
      setBackgroundLocationEnabled(backgroundStatus.status === 'granted');
      setCameraEnabled(cameraStatus.status === 'granted');
      setAudioEnabled(audioStatus.status === 'granted');
      setPhotoEnabled(photoStatus.status === 'granted');

      // Save current states
      await saveSettings({
        location: locationStatus.status === 'granted',
        backgroundLocation: backgroundStatus.status === 'granted',
        camera: cameraStatus.status === 'granted',
        audio: audioStatus.status === 'granted',
        photo: photoStatus.status === 'granted',
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settings: any) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const openAppSettings = () => {
    Alert.alert(
      'Permission Required',
      'Please enable the permission in your device settings',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        },
      ]
    );
  };

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationEnabled(true);
        await saveSettings({
          location: true,
          backgroundLocation: backgroundLocationEnabled,
          camera: cameraEnabled,
          audio: audioEnabled,
          photo: photoEnabled,
        });
      } else {
        setLocationEnabled(false);
        openAppSettings();
      }
    } else {
      setLocationEnabled(false);
      Alert.alert(
        'Disable Location',
        'To disable location access, please go to your device settings',
        [{ text: 'OK' }]
      );
      await saveSettings({
        location: false,
        backgroundLocation: backgroundLocationEnabled,
        camera: cameraEnabled,
        audio: audioEnabled,
        photo: photoEnabled,
      });
    }
  };

  const handleBackgroundLocationToggle = async (value: boolean) => {
    if (value) {
      // Foreground is required for background
      let fgStatus = await Location.getForegroundPermissionsAsync();
      if (fgStatus.status !== 'granted') {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== 'granted') {
          setBackgroundLocationEnabled(false);
          openAppSettings();
          return;
        }
        setLocationEnabled(true);
      }
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        setBackgroundLocationEnabled(true);
        await saveSettings({
          location: locationEnabled,
          backgroundLocation: true,
          camera: cameraEnabled,
          audio: audioEnabled,
          photo: photoEnabled,
        });
      } else {
        setBackgroundLocationEnabled(false);
        openAppSettings();
      }
    } else {
      setBackgroundLocationEnabled(false);
      Alert.alert(
        'Disable Background Location',
        'To disable background location access, please go to your device settings',
        [{ text: 'OK' }]
      );
      await saveSettings({
        location: locationEnabled,
        backgroundLocation: false,
        camera: cameraEnabled,
        audio: audioEnabled,
        photo: photoEnabled,
      });
    }
  };

  const handleCameraToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        setCameraEnabled(true);
        await saveSettings({
          location: locationEnabled,
          backgroundLocation: backgroundLocationEnabled,
          camera: true,
          audio: audioEnabled,
          photo: photoEnabled,
        });
      } else {
        setCameraEnabled(false);
        openAppSettings();
      }
    } else {
      setCameraEnabled(false);
      Alert.alert(
        'Disable Camera',
        'To disable camera access, please go to your device settings',
        [{ text: 'OK' }]
      );
      await saveSettings({
        location: locationEnabled,
        backgroundLocation: backgroundLocationEnabled,
        camera: false,
        audio: audioEnabled,
        photo: photoEnabled,
      });
    }
  };

  const handleAudioToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        setAudioEnabled(true);
        await saveSettings({
          location: locationEnabled,
          backgroundLocation: backgroundLocationEnabled,
          camera: cameraEnabled,
          audio: true,
          photo: photoEnabled,
        });
      } else {
        setAudioEnabled(false);
        openAppSettings();
      }
    } else {
      setAudioEnabled(false);
      Alert.alert(
        'Disable Audio',
        'To disable microphone access, please go to your device settings',
        [{ text: 'OK' }]
      );
      await saveSettings({
        location: locationEnabled,
        backgroundLocation: backgroundLocationEnabled,
        camera: cameraEnabled,
        audio: false,
        photo: photoEnabled,
      });
    }
  };

  const handlePhotoToggle = async (value: boolean) => {
    if (value) {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        setPhotoEnabled(true);
        await saveSettings({
          location: locationEnabled,
          backgroundLocation: backgroundLocationEnabled,
          camera: cameraEnabled,
          audio: audioEnabled,
          photo: true,
        });
      } else {
        setPhotoEnabled(false);
        openAppSettings();
      }
    } else {
      setPhotoEnabled(false);
      Alert.alert(
        'Disable Photo Library',
        'To disable photo library access, please go to your device settings',
        [{ text: 'OK' }]
      );
      await saveSettings({
        location: locationEnabled,
        backgroundLocation: backgroundLocationEnabled,
        camera: cameraEnabled,
        audio: audioEnabled,
        photo: false,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Location (Foreground)</Text>
            <Text style={styles.settingDescription}>
              Allow the app to access your location while using the app
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={locationEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Background Location */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Location (Background)</Text>
            <Text style={styles.settingDescription}>
              Allow the app to access your location in the background for emergency tracking
            </Text>
          </View>
          <Switch
            value={backgroundLocationEnabled}
            onValueChange={handleBackgroundLocationToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={backgroundLocationEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Camera */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Camera</Text>
            <Text style={styles.settingDescription}>
              Enable camera access so that the app can use camera while in panic mode
            </Text>
          </View>
          <Switch
            value={cameraEnabled}
            onValueChange={handleCameraToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={cameraEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Audio */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Audio</Text>
            <Text style={styles.settingDescription}>
              Enable audio access so that the app can use audio while in panic mode
            </Text>
          </View>
          <Switch
            value={audioEnabled}
            onValueChange={handleAudioToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={audioEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Photo */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Photo Library</Text>
            <Text style={styles.settingDescription}>
              Enable photo library access so that the app can save media while in panic mode
            </Text>
          </View>
          <Switch
            value={photoEnabled}
            onValueChange={handlePhotoToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={photoEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Permissions can also be managed in your device's system settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
});