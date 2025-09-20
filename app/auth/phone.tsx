// app/auth/phone.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const router = useRouter();

  const handleContinue = () => {
    if (!phone.trim()) {
      Alert.alert("Invalid", "Please enter your phone number");
      return;
    }
    // Navigate to OTP screen, pass phone via state (or context/global state)
    router.push({ pathname: '/auth/otp', params: { phone } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SafeCircle</Text>
      <Text style={styles.subtitle}>Your Circle Management Platform</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          placeholder="+260 965 502 028"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By Continuing, you agree to our Terms & Conditions
      </Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#d32f2f',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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
  terms: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
  },
});