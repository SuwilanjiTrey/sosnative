// app/components/payment-gateway.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import {getDoc} from 'firebase/firestore';

const BACKEND_URL = 'https://safecircle-production.up.railway.app';

export default function PaymentGatewayScreen() {
  const router = useRouter();

  const { planId, amount, planName } = useLocalSearchParams();
  const webviewRef = useRef<WebView>(null);

  // Keep track of which page we've seen
  const hasSeenSuccessRef = useRef(false);
  const hasSeenCancelRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  const isWeb = Platform.OS === 'web';

  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // First, fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        //addDebugLog('⏳ Waiting for user authentication...');
        return;
      }
      
      try {
        //addDebugLog('🔍 Fetching user data...');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          //addDebugLog('✅ User data loaded');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        //addDebugLog(`❌ Error fetching user data: ${error.message}`);
      } finally {
        setIsInitialized(true);
      }
    };

    fetchUserData();
  }, [user]);

  console.log("heres the users information: ", userData);

  // Then, create checkout session only after user data is loaded
  useEffect(() => {
    // Don't proceed until initialization is complete
    if (!isInitialized) {
      return;
    }

    ////addDebugLog('🟢 Initialization complete, validating...');
    //addDebugLog(`User: ${user?.uid || 'NOT AUTHENTICATED'}`);
    //addDebugLog(`Plan: ${planName}, Amount: ${amount}`);
    
    if (!user) {
      //addDebugLog('❌ No user found after initialization - aborting');
      Alert.alert('Error', 'User not authenticated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    if (!amount || !planId || !planName) {
      //addDebugLog('❌ Missing required parameters');
      Alert.alert('Error', 'Missing payment information', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    createCheckoutSession();
  }, [isInitialized, user?.uid, planId, amount, planName]);

  const calculateEndDate = () => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    return endDate;
  };

  // Add debug logging function
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => `${prev}\n${message}`);
  };

  const createCheckoutSession = async () => {
    try {
      //addDebugLog('🔵 Starting checkout session creation...');
      //addDebugLog(`Backend URL: ${BACKEND_URL}`);

      // Test backend connectivity first
      //addDebugLog('🔍 Testing backend connectivity...');
      try {
        const healthCheck = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const healthData = await healthCheck.json();
        //addDebugLog(`✅ Backend is reachable: ${JSON.stringify(healthData)}`);
      } catch (healthError) {
        //addDebugLog(`❌ Backend health check failed: ${healthError.message}`);
        throw new Error(`Backend server is not reachable at ${BACKEND_URL}. Please check if the server is running.`);
      }

      const requestBody = {
        amount: parseFloat(amount as string),
        currency: 'usd',
        userId: user!.uid,
        planId: planId as string,
        planName: planName as string,
        // Use backend URLs that will redirect back to the app
        successUrl: `${BACKEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&userId=${user!.uid}`,
        cancelUrl: `${BACKEND_URL}/payment-cancel?userId=${user!.uid}`,
      };

      //addDebugLog(`📤 Sending request to: ${BACKEND_URL}/create-checkout-session`);
      //addDebugLog(`📤 Request body: ${JSON.stringify(requestBody, null, 2)}`);

      const response = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      //addDebugLog(`📥 Response status: ${response.status}`);
      
      const responseText = await response.text();
      //addDebugLog(`📥 Response body: ${responseText.substring(0, 200)}...`);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      //addDebugLog(`✅ Parsed data successfully`);
      //addDebugLog(`✅ Checkout URL: ${data.url ? 'RECEIVED' : 'MISSING'}`);

      if (!data.url) {
        throw new Error('No checkout URL returned from server');
      }

      setCheckoutUrl(data.url);
      setSessionId(data.id);
      //addDebugLog(`✅ State updated with checkout URL`);

      // On web, redirect directly to Stripe Checkout
      if (isWeb && data.url) {
        //addDebugLog('🌐 Redirecting web browser...');
        window.location.href = data.url;
      }
      
      setLoading(false);
      //addDebugLog('✅ Loading complete');

    } catch (error: any) {
      //addDebugLog(`❌ ERROR: ${error.message}`);
      console.error('❌ Full Checkout Error:', error);
      
      setLoading(false);
      
      Alert.alert(
        'Payment Error',
        `Failed to initialize payment.\n\nError: ${error.message}\n\nBackend: ${BACKEND_URL}`,
        [
          { text: 'Retry', onPress: () => {
            setLoading(true);
            createCheckoutSession();
          }},
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
    }
  };

  const handlePaymentSuccess = async (retrievedSessionId: string) => {
    try {
      //addDebugLog('✅ Processing payment success...');
      const startDate = new Date();
      const endDate = calculateEndDate();

      await updateDoc(doc(db, 'users', user!.uid), {
        isPremium: true,
        premiumPlan: planId,
        premiumStartDate: startDate,
        premiumEndDate: endDate,
        lastPaymentAmount: parseFloat(amount as string),
        lastPaymentDate: startDate,
        stripeSessionId: retrievedSessionId,
        updatedAt: serverTimestamp(),
      });

      //addDebugLog('✅ User document updated');

      Alert.alert(
        'Payment Successful! 🎉',
        `You are now a premium member!\n\nPlan: ${planName}\nAmount: K${amount}\nValid until: ${endDate.toLocaleDateString()}`,
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)/profile') }]
      );
    } catch (error: any) {
      //addDebugLog(`❌ Subscription update error: ${error.message}`);
      console.error('Subscription update error:', error);
      Alert.alert('Error', 'Payment succeeded but account update failed. Please contact support.');
    }
  };

  // Keep track of which page we've seen

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    //addDebugLog(`🔗 Navigation: ${url}`);

    // Check for success URL - capture session ID
    if (url.includes('/payment-success') && !hasSeenSuccessRef.current) {
      //addDebugLog('✅ Payment success page detected');
      hasSeenSuccessRef.current = true;
      
      try {
        // Extract session_id from URL
        const urlObj = new URL(url);
        const retrievedSessionId = urlObj.searchParams.get('session_id');

        if (retrievedSessionId) {
          //addDebugLog(`📝 Session ID captured: ${retrievedSessionId}`);
          sessionIdRef.current = retrievedSessionId;
        } else {
          //addDebugLog('⚠️ No session ID found in success URL');
        }
      } catch (error) {
        //addDebugLog(`❌ Error parsing success URL: ${error.message}`);
      }
      return;
    }

    // Check for cancel URL
    if (url.includes('/payment-cancel') && !hasSeenCancelRef.current) {
      //addDebugLog('⚠️ Payment cancel page detected');
      hasSeenCancelRef.current = true;
      return;
    }

    // Check if WebView redirected to about:blank (means success/cancel page finished)
    if (url === 'about:blank') {
      //addDebugLog('🔄 Detected redirect to about:blank');
      
      // If we saw success page and have session ID, process payment
      if (hasSeenSuccessRef.current && sessionIdRef.current) {
        //addDebugLog('✅ Processing payment success...');
        await handlePaymentSuccess(sessionIdRef.current);
      } 
      // If we saw cancel page, show cancel alert
      else if (hasSeenCancelRef.current) {
        //addDebugLog('❌ Processing payment cancellation...');
        Alert.alert('Payment Cancelled', 'No charges were made.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
      
      return;
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Payment?', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => router.back() },
    ]);
  };

  // Show debug info in dev mode
  const showDebugInfo = __DEV__;

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading user information...</Text>
          {showDebugInfo && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // For web, show loading while redirecting
  if (isWeb) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Redirecting to secure checkout...</Text>
          {showDebugInfo && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // For mobile, show WebView
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Plan</Text>
          <Text style={styles.summaryValue}>{planName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>K{amount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>30 Days</Text>
        </View>
      </View>

      {/* Debug Info (only in dev) */}
      {showDebugInfo && (
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )}

      {/* WebView / Loader */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Preparing secure checkout...</Text>
        </View>
      ) : checkoutUrl ? (
        <WebView
          ref={webviewRef}
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            //addDebugLog(`❌ WebView Error: ${nativeEvent.description}`);
          }}
          onLoad={() => addDebugLog('✅ WebView loaded')}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
        />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No checkout URL available</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              createCheckoutSession();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="lock" size={16} color="#666" />
        <Text style={styles.footerText}>
          Secured by Stripe • Your payment information is encrypted
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
    textAlign: 'center',
  },
  debugBox: {
    margin: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    maxHeight: 150,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});