// app/auth/login.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { StyledText } from '../../components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user is a responder
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const isResponder = userDoc.exists() && userDoc.data().isResponder;
      
      // Check if user exists in Responders collection
      const responderQuery = await getDoc(doc(db, "Responders", user.uid));
      const isInstitutionResponder = responderQuery.exists();
      
      if (isResponder || isInstitutionResponder) {
        Alert.alert(
          "Welcome Responder!",
          "You've successfully logged in as a responder!",
          [
            {
              text: "Continue",
              onPress: () => router.replace('/responder/r-dashboard'),
              style: "default"
            }
          ]
        );
      } else {
        Alert.alert(
          "Welcome Back!",
          "You've successfully logged in!",
          [
            {
              text: "Continue",
              onPress: () => router.replace('/(tabs)/dashboard'),
              style: "default"
            }
          ]
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "Failed to login. Please check your credentials and try again.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email. Please register first.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/network-request-failed'){
        errorMessage = "Network unstable, please make sure you a stable internet connection."
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* App Logo */}
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <StyledText type="title" style={styles.title}>
            Welcome Back
          </StyledText>
          <Text style={styles.subtitle}>Sign in to continue to SafeCircle</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging In...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/auth/register')} 
            style={styles.registerLink}
            disabled={loading}
          >
            <Text style={styles.registerText}>Don't have an account? Register</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/auth/register-responder')} 
            style={styles.registerLink}
            disabled={loading}
          >
            <Text style={styles.registerText}>Register as a Responder Institution</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={styles.version}>Version 2.4</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60, // Space from top
    paddingBottom: 40, // Space from bottom
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
    marginBottom: 20,
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
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
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
  registerLink: {
    marginTop: 25,
    alignItems: 'center',
  },
  registerText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '500',
  },
  versionContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  version: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});