// app/auth/otp.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
// Add this after imports
declare global {
    interface Window {
      recaptchaVerifier: any;
    }
  }

export default function OTPScreen() {
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize ReCaptcha for web (invisible)
    if (typeof window !== 'undefined') {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        { size: 'invisible', defaultCountry: 'ZM' }
      );
    }
  }, []);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert("Invalid", "Please enter the 4-digit code");
      return;
    }

    setLoading(true);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone as string, window.recaptchaVerifier);
      await confirmationResult.confirm(code);
      router.replace('/(drawer)/dashboard');
    } catch (error) {
      Alert.alert("Error", "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
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
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.resend}>Didn’t receive the code? Resend code</Text>
      </TouchableOpacity>

      <View id="recaptcha-container" />
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
    fontWeight: 'bold',
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
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resend: {
    textAlign: 'center',
    color: '#d32f2f',
    fontSize: 14,
  },
});