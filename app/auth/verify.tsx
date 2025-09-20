// app/auth/verify.tsx
import { View, Text, Button, Alert } from 'react-native';
import { auth } from '../../firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function VerifyScreen() {
  const router = useRouter();

  const resendEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser!);
      Alert.alert("Sent", "Verification email resent.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const checkVerified = () => {
    if (auth.currentUser?.emailVerified) {
      router.replace('/(drawer)/dashboard');
    } else {
      Alert.alert("Not Verified", "Please verify your email first.");
    }
  };

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, textAlign: 'center' }}>Please verify your email address.</Text>
      <Button title="Resend Verification Email" onPress={resendEmail} />
      <Button title="I Verified — Continue" onPress={checkVerified} color="green" />
    </View>
  );
}