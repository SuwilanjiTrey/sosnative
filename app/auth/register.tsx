// app/auth/register.tsx
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { requestForegroundPermissionsAsync, requestBackgroundPermissionsAsync } from 'expo-location';
import * as Notifications from 'expo-notifications';
import PermissionModal from '../components/PermissionModal';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        settings: { emailFallback: true, smsFallback: false },
        fcmTokens: {}
      });

      setShowPermissionModal(true); // Show permission modal after successful register
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    }
  };

  const handlePermissionsGranted = () => {
    setShowPermissionModal(false);
    router.replace('/(drawer)/dashboard');
  };

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Create Account</Text>
      <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={{ borderWidth: 1, marginVertical: 8, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={{ borderWidth: 1, marginVertical: 8, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginVertical: 8, padding: 8 }} />
      <Button title="Register" onPress={handleRegister} />
      <TouchableOpacity onPress={() => router.push('/auth/login')} style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ color: 'blue' }}>Already have an account? Login</Text>
      </TouchableOpacity>

      <PermissionModal
        visible={showPermissionModal}
        onGranted={handlePermissionsGranted}
      />
    </View>
  );
}