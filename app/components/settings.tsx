import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [photoEnabled, setPhotoEnabled] = useState(false);

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
            <Text style={styles.settingTitle}>Location</Text>
            <Text style={styles.settingDescription}>
              Set the location so the app can track you
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={locationEnabled ? '#4CAF50' : '#f4f3f4'}
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
            onValueChange={setCameraEnabled}
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
            onValueChange={setAudioEnabled}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={audioEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        </View>

        {/* Photo */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Photo</Text>
            <Text style={styles.settingDescription}>
              Enable photo access so that the app can use photo while in panic mode
            </Text>
          </View>
          <Switch
            value={photoEnabled}
            onValueChange={setPhotoEnabled}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={photoEnabled ? '#4CAF50' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
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
});