// app/auth/phone.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyledText } from '../../components/StyledText';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const router = useRouter();

  const handleContinue = () => {
    if (!phone.trim()) {
      Alert.alert("Invalid", "Please enter your phone number");
      return;
    }
    router.push({ pathname: '/auth/otp', params: { phone } });
  };

  return (
    <View style={styles.container}>
      {/* App Logo */}
      <Image
        source={require('../../assets/images/icon.png')} // 👈 Update path to your icon
        style={styles.logo}
        resizeMode="contain"
      />

      <StyledText type="title" style={styles.title}>
        SafeCircle
      </StyledText>
      <Text style={styles.subtitle}>Your Circle Management Platform</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputContainer}>
          <Text style={styles.countryCode}>+260</Text>
          <TextInput
            placeholder="965 502 028"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.phoneInput}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/test')} style={styles.testButton}>
        <Text style={styles.testButtonText}>🧪 Test All Features</Text>
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
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#d32f2f',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
    fontSize: 16,
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 15,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 15,
    minWidth: 60,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    padding: 0,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  testButton: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginTop: 20,
  },
});