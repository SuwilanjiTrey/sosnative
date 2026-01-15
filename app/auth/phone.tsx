// app/auth/phone.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyledText } from '../../components/StyledText';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    try {
      const formattedPhone = `+260${phoneNumber}`;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobileNumber', '==', formattedPhone));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking phone number:', error);
      throw error;
    }
  };

  const handleContinue = async () => {
    if (!phone.trim()) {
      Alert.alert("Invalid", "Please enter your phone number");
      return;
    }

    // Remove all spaces and validate exactly 9 digits (since +260 is already provided)
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length !== 9) {
      Alert.alert(
        "Invalid Phone Number", 
        "Please enter exactly 9 digits. Zambian phone numbers are +260 followed by 9 digits."
      );
      return;
    }

    // Ensure all characters are digits
    if (!/^\d{9}$/.test(cleanPhone)) {
      Alert.alert("Invalid Phone Number", "Phone number must contain only digits");
      return;
    }

    setLoading(true);

    try {
      // Check if phone number already exists
      const phoneExists = await checkPhoneExists(cleanPhone);
      
      if (phoneExists) {
        Alert.alert(
          "Phone Number Already in Use",
          "This phone number is already registered. Please log in or use a different number.",
          [
            {
              text: "Use Different Number",
              style: "cancel"
            },
            {
              text: "Go to Login",
              onPress: () => router.replace('/auth/login')
            }
          ]
        );
        setLoading(false);
        return;
      }

      // If phone doesn't exist, proceed to OTP verification
      router.push({ pathname: '/auth/otp', params: { phone: cleanPhone } });
    } catch (error) {
      console.error('Error during phone check:', error);
      Alert.alert(
        "Error",
        "Could not verify phone number. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* App Logo */}
      <Image
        source={require('../../assets/images/icon.png')}
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
            editable={!loading}
          />
        </View>
      </View>
 
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
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
  buttonDisabled: {
    backgroundColor: '#ccc',
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