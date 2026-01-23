// app/auth/otp.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export default function OTPScreen() {
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    if (code.length !== 4) {
      Alert.alert("Invalid Code", "Please enter a 4-digit code");
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert("Error", "User session not found. Please try again.");
        setLoading(false);
        return;
      }

      // Format phone number with country code
      const formattedPhone = `+260${phone}`;

      // Update user document with phone number
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mobileNumber: formattedPhone,
        phoneVerified: true,
        updatedAt: new Date(),
      });

      console.log('Phone verified and saved successfully');
      router.replace('/auth/location-setup');
    } catch (error: any) {
      console.error('Error verifying phone:', error);
      Alert.alert("Verification Failed", "Could not verify your phone number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCode('');
    Alert.alert("Success", "New code sent successfully!");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          We have sent an OTP to your mobile number {phone}
        </Text>
      </View>

      <TextInput
        placeholder="5057"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={4}
        style={styles.otpInput}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, (code.length !== 4 || loading) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={code.length !== 4 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={loading}>
        <Text style={styles.resend}>Didn't receive the code? Resend code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 10,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  resend: {
    textAlign: 'center',
    color: '#d32f2f',
    fontSize: 14,
  },
});