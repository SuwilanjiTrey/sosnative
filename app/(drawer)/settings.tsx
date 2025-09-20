// app/(drawer)/settings.tsx
import { View, Text, Switch, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import Toast from 'react-native-toast-message';
import { StyledText } from '../../components/StyledText'; // Use your brand-styled text


const permissions = [
  { label: 'Location', description: 'Set the location so the app can track you', enabled: true },
  { label: 'Camera', description: 'Enable camera access for panic mode', enabled: false },
  { label: 'Audio', description: 'Enable audio access for panic mode', enabled: false },
  { label: 'Photo', description: 'Enable photo access for panic mode', enabled: false },
];


export default function SettingsScreen() {
  const [settings, setSettings] = useState({ emailFallback: true, smsFallback: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setLoading(false);
        return;
      }

      const userDoc = doc(db, 'users', user.uid);
      const snap = await getDoc(userDoc);

      if (snap.exists()) {
        const userData = snap.data();
        setSettings(userData.settings || { emailFallback: true, smsFallback: false });
      } else {
        // User doc doesn't exist — initialize with defaults
        await updateDoc(userDoc, {
          settings: { emailFallback: true, smsFallback: false },
          lastActiveAt: new Date()
        });
        setSettings({ emailFallback: true, smsFallback: false });
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      Alert.alert("Error", "Failed to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: 'emailFallback' | 'smsFallback') => {
    if (key === 'smsFallback') {
      Alert.alert(
        "SMS Fallback Disabled",
        "SMS costs money and is disabled in MVP. Contact admin to enable."
      );
      return;
    }

    if (saving) return; // Prevent double-toggle

    setSaving(true);
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings); // Optimistic update

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, { settings: newSettings });
      Toast.show({ type: 'success', text1: '✅ Settings updated' });
    } catch (error: any) {
      console.error("Failed to update settings:", error);
      Toast.show({ type: 'error', text1: '❌ Failed to save' });
      // Revert optimistic update
      setSettings({ ...settings, [key]: settings[key] });
      Alert.alert("Error", error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StyledText type="subtitle">Loading settings...</StyledText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StyledText type="title" style={{ marginBottom: 20 }}>Settings</StyledText>

      {permissions.map((perm, index) => (
        <View key={index} style={styles.permissionRow}>
          <View>
            <StyledText>{perm.label}</StyledText>
            <Text style={styles.description}>{perm.description}</Text>
          </View>
          <Switch
            value={perm.enabled}
            trackColor={{ false: "#ccc", true: "#d32f2f" }}
            thumbColor={perm.enabled ? "#fff" : "#f4f3f4"}
          />
        </View>
      ))}


      {/* Email Fallback */}
      <View style={styles.settingRow}>
        <View>
          <StyledText>Email Alerts</StyledText>
          <StyledText style={styles.settingDescription}>
            Send SOS alerts via email to your Circle
          </StyledText>
        </View>
        <Switch
          value={settings.emailFallback}
          onValueChange={() => toggleSetting('emailFallback')}
          disabled={saving}
          trackColor={{ false: "#ccc", true: "#d32f2f" }} // SafeCircle Red when enabled
          thumbColor={settings.emailFallback ? "#fff" : "#f4f3f4"}
        />
      </View>

      {/* SMS Fallback (Disabled) */}
      <View style={[styles.settingRow, styles.disabled]}>
        <View>
          <StyledText style={{ color: '#aaa' }}>SMS Alerts (Disabled)</StyledText>
          <StyledText style={[styles.settingDescription, { color: '#bbb' }]}>
            Premium feature — contact admin to enable
          </StyledText>
        </View>
        <Switch
          value={settings.smsFallback}
          disabled
          trackColor={{ false: "#eee", true: "#d32f2f" }}
        />
      </View>

      <TouchableOpacity
        onPress={() => Alert.alert("App Info", "SafeCircle v1.0 MVP\n\nEmergency SOS System")}
        style={styles.versionContainer}
      >
        <StyledText style={styles.versionText}>App Version 1.0</StyledText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    maxWidth: 200,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  disabled: {
    opacity: 0.6,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  versionContainer: {
    padding: 15,
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
  },
  versionText: {
    color: '#888',
    fontSize: 14,
  },
});
