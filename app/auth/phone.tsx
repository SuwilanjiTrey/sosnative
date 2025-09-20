// app/auth/phone.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = () => {
    if (!phone.trim()) {
      alert("Please enter your phone number");
      return;
    }
    // Navigate to OTP screen
    router.push({ pathname: '/auth/otp', params: { phone } });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>SafeCircle</Text>
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

      <Text style={styles.terms}>
        By Continuing, you agree to our Terms & Conditions
      </Text>

     
<TouchableOpacity
  onPress={() => router.push('/test')}
  style={styles.testButton}
>
  <Text style={styles.testButtonText}>🧪 Test All Features</Text>
</TouchableOpacity>

    </Animated.View>


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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
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
  // Add to styles:
testButton: {
  marginTop: 20,
  padding: 15,
  backgroundColor: '#e3f2fd',
  borderRadius: 8,
  alignItems: 'center',
},
testButtonText: {
  color: '#2196f3',
  fontSize: 16,
  fontWeight: '600',
},
});



