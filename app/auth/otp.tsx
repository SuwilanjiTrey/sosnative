// app/auth/otp.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OTPScreen() {
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = () => {
    if (code.length === 4) {
      // Mock successful verification
      console.log('OTP verified successfully');
      router.replace('/(drawer)/dashboard'); // ✅ Use replace instead of push
    } else {
      Alert.alert("Invalid Code", "Please enter a 4-digit code");
    }
  };

  const handleResend = () => {
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
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleVerify}
        disabled={code.length !== 4}
      >
        <Text style={styles.buttonText}>Verify Code</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend}>
        <Text style={styles.resend}>Didn’t receive the code? Resend code</Text>
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