// components/SOSButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  PanResponder,
  Dimensions,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { getCurrentLocation } from '../utils/location';
import { sendSOSNotification } from '../utils/sosNotification';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

// UUID helper
function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type SOSButtonProps = {
  onSOSTriggered: () => void;
};

type Ripple = {
  id: number;
  progress: Animated.Value;
};

type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  initials: string;
};

export default function SOSButton({ onSOSTriggered }: SOSButtonProps) {
  const [showEmergencyScreen, setShowEmergencyScreen] = useState(false);
  const [emergencyTimer, setEmergencyTimer] = useState(10);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const rippleId = useRef(0);

  // Fetch emergency contact on component mount
  useEffect(() => {
    fetchEmergencyContact();
    // Get location on mount
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    try {
      console.log('[LOCATION] Fetching current location...');
      const location = await getCurrentLocation();
      if (location) {
        console.log('[LOCATION] Location obtained:', location);
        setCurrentLocation(location);
      } else {
        console.log('[LOCATION] No location available');
      }
    } catch (error) {
      console.error('[LOCATION] Error getting location:', error);
    }
  };

  const fetchEmergencyContact = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      console.log('[CONTACT] Fetching emergency contact...');
      // Get user's circles
      const circlesSnapshot = await getDocs(
        query(collection(db, "users", currentUser.uid, "circles"), where("status", "==", "accepted"))
      );

      if (!circlesSnapshot.empty) {
        // Get the first contact as emergency contact
        const contactDoc = circlesSnapshot.docs[0];
        const contactData = contactDoc.data();
        
        // Extract initials from name
        const nameParts = contactData.name.split(' ');
        const initials = nameParts.length > 1 
          ? nameParts[0][0] + nameParts[1][0] 
          : nameParts[0].substring(0, 2);

        const contact = {
          id: contactDoc.id,
          name: contactData.name,
          phone: contactData.mobileNumber,
          relation: contactData.category,
          initials: initials.toUpperCase()
        };

        console.log('[CONTACT] Emergency contact set:', contact.name);
        setEmergencyContact(contact);
      } else {
        console.log('[CONTACT] No emergency contacts found');
      }
    } catch (error) {
      console.error('[CONTACT] Error fetching emergency contact:', error);
    }
  };

  /** Emergency Screen Timer */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showEmergencyScreen && emergencyTimer > 0) {
      timer = setTimeout(() => setEmergencyTimer(emergencyTimer - 1), 1000);
    } else if (emergencyTimer === 0) {
      sendSOSAlert();
    }
    return () => clearTimeout(timer);
  }, [showEmergencyScreen, emergencyTimer]);

  /** Slide up animation when emergency screen appears */
  useEffect(() => {
    if (showEmergencyScreen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [showEmergencyScreen]);

  /** Infinite pulse animation for SOS button */
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  /** Continuous ripple animation */
  useEffect(() => {
    if (!showEmergencyScreen) {
      const rippleInterval = setInterval(createRipple, 2000);
      return () => clearInterval(rippleInterval);
    }
  }, [showEmergencyScreen]);

  /** Create ripple animation */
  const createRipple = () => {
    const id = rippleId.current++;
    const progress = new Animated.Value(0);

    setRipples((prev) => [...prev, { id, progress }]);

    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });
  };

  /** Trigger SOS - Show Emergency Screen */
  const triggerSOS = async () => {
    console.log('[SOS] SOS button pressed - showing emergency screen');
    
    // Get fresh location when triggering
    await fetchCurrentLocation();
    
    setShowEmergencyScreen(true);
    setEmergencyTimer(10);
    Toast.show({ type: 'success', text1: 'Emergency Activated!' });
  };

  /** Send SOS Alert (after timer expires) - KEEPING YOUR WORKING LOGIC */
  const sendSOSAlert = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      console.log("[SOS] Current user in sendSOSAlert:", currentUser);
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!currentUser.uid) {
        throw new Error('User UID is missing');
      }

      console.log("[SOS] User UID:", currentUser.uid);

      // Get user details
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const isPremium = userData.isPremium === true;
      console.log("[SOS] User data:", { name: userData.name, isPremium, plan: userData.premiumPlan });
      
      // Get current location using your existing utility (FRESH FETCH)
      console.log("[SOS] Getting fresh location...");
      const locationData = await getCurrentLocation();
      console.log("[SOS] Location data:", locationData);
      
      if (!locationData) {
        console.warn('[SOS] Could not get location - proceeding without location');
      }
      
      // Convert to the format expected by sendSOSNotification
      // IMPORTANT: Add location as proper object field
      const location = locationData ? {
        latitude: locationData.lat,
        longitude: locationData.lng
      } : null;
      
      console.log("[SOS] Sending SOS with data:", {
        userId: currentUser.uid,
        userName: userData.name,
        userPhone: userData.mobileNumber,
        location,
        information: ''
      });
      
      // YOUR WORKING sendSOSNotification function - DO NOT CHANGE
      await sendSOSNotification({
        userId: currentUser.uid,
        userName: userData.name,
        userPhone: userData.mobileNumber,
        location,
        information: '' // User didn't have time to specify, making it serious
      });

      console.log("[SOS] SOS notification sent successfully!");
      setShowEmergencyScreen(false);
      
      // Show different messages based on user type
      const alertMessage = isPremium 
        ? 'Emergency alert has been sent to your circle members and nearby emergency responders!'
        : 'Emergency alert has been sent to your circle members!';
      
      Alert.alert('SOS SENT', alertMessage);
      Toast.show({ 
        type: 'success', 
        text1: '🚨 SOS Alert Sent!',
        text2: isPremium 
          ? 'Notified circle members and responders' 
          : 'Notified circle members'
      });
      
      onSOSTriggered();
    } catch (error) {
      console.error('[SOS] Error sending SOS:', error);
      Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
      setShowEmergencyScreen(false);
    } finally {
      setLoading(false);
    }
  };

  /** Mark as Safe */
  const markAsSafe = () => {
    console.log('[SOS] User marked as safe - canceling alert');
    setShowEmergencyScreen(false);
    setEmergencyTimer(10);
    Alert.alert('Marked as Safe', 'Emergency has been cancelled.');
    Toast.show({ type: 'success', text1: '✓ Marked as Safe' });
  };

  /** Call Emergency Contact */
  const callEmergencyContact = () => {
    if (emergencyContact) {
      console.log('[CONTACT] Calling emergency contact:', emergencyContact.name);
      Alert.alert('Call Emergency Contact', `Would you like to call ${emergencyContact.name} at ${emergencyContact.phone}?`, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            // Linking.openURL(`tel:${emergencyContact.phone}`);
            Toast.show({ type: 'info', text1: 'Calling emergency contact...' });
          }
        }
      ]);
    }
  };

  /** Pan Responder for Swipe to Mark Safe */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const maxSwipe = width - 120;
        if (gestureState.dx > 0 && gestureState.dx < maxSwipe) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = width - 200;
        if (gestureState.dx > threshold) {
          // Swipe completed
          Animated.timing(swipeAnim, {
            toValue: width - 100,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            swipeAnim.setValue(0);
            markAsSafe();
          });
        } else {
          // Swipe not completed, reset
          Animated.spring(swipeAnim, {
            toValue: 0,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <>
      {/* Default SOS button with ripples */}
      <View style={styles.buttonContainer as StyleProp<ViewStyle>}>
        {ripples.map((r) => (
          <Animated.View
            key={r.id}
            style={[
              styles.ripple as StyleProp<ViewStyle>,
              {
                transform: [
                  {
                    scale: r.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 2.5],
                    }),
                  },
                ],
                opacity: r.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0],
                }),
              },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.pulseRing as StyleProp<ViewStyle>,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }),
                },
              ],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            },
          ]}
        />

        <TouchableOpacity
          onPress={triggerSOS}
          style={styles.button as StyleProp<ViewStyle>}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.buttonText as StyleProp<TextStyle>}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Screen Modal - ENHANCED UI */}
      <Modal
        visible={showEmergencyScreen}
        transparent={true}
        animationType="none"
        onRequestClose={markAsSafe}
      >
        <View style={styles.emergencyOverlay as StyleProp<ViewStyle>}>
          <Animated.View
            style={[
              styles.emergencyScreen as StyleProp<ViewStyle>,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle bar */}
            <View style={styles.handleBar as StyleProp<ViewStyle>} />

            <View style={styles.emergencyHeader as StyleProp<ViewStyle>}>
              <Text style={styles.emergencyTitle as StyleProp<TextStyle>}>
                Emergency in Progress
              </Text>
              {currentLocation && (
                <Text style={styles.locationIndicator as StyleProp<TextStyle>}>
                  📍 Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </Text>
              )}
            </View>

            {/* SOS Button Visual */}
            <View style={styles.emergencySOSContainer as StyleProp<ViewStyle>}>
              {/* Animated ripple rings */}
              <Animated.View
                style={[
                  styles.rippleRing,
                  styles.rippleRing1,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.15],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  styles.rippleRing2,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  styles.rippleRing3,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.05],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.15, 0],
                    }),
                  },
                ]}
              />

              <View style={styles.emergencySOSButton as StyleProp<ViewStyle>}>
                <Text style={styles.emergencySOSText as StyleProp<TextStyle>}>SOS</Text>
              </View>
            </View>

            {/* Timer Display */}
            <View style={styles.timerContainer as StyleProp<ViewStyle>}>
              <Text style={styles.timerLabel as StyleProp<TextStyle>}>
                Sending alert in
              </Text>
              <View style={styles.timerBadge as StyleProp<ViewStyle>}>
                <Text style={styles.timerNumber as StyleProp<TextStyle>}>
                  {emergencyTimer}
                </Text>
              </View>
              <Text style={styles.timerLabel as StyleProp<TextStyle>}>seconds</Text>
            </View>

            {/* Emergency Contact Info */}
            {emergencyContact && (
              <View style={styles.contactCard as StyleProp<ViewStyle>}>
                <View style={styles.contactHeader as StyleProp<ViewStyle>}>
                  <Text style={styles.contactHeaderText as StyleProp<TextStyle>}>
                    Emergency Contact
                  </Text>
                </View>
                <View style={styles.contactBody as StyleProp<ViewStyle>}>
                  <View style={styles.contactInfo as StyleProp<ViewStyle>}>
                    <View style={styles.avatar as StyleProp<ViewStyle>}>
                      <Text style={styles.avatarText as StyleProp<TextStyle>}>
                        {emergencyContact.initials}
                      </Text>
                    </View>
                    <View style={styles.contactDetails as StyleProp<ViewStyle>}>
                      <Text style={styles.contactName as StyleProp<TextStyle>}>
                        {emergencyContact.name}
                      </Text>
                      <Text style={styles.contactPhone as StyleProp<TextStyle>}>
                        {emergencyContact.phone}
                      </Text>
                      <Text style={styles.contactRelation as StyleProp<TextStyle>}>
                        {emergencyContact.relation}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.callButton as StyleProp<ViewStyle>}
                    onPress={callEmergencyContact}
                  >
                    <Text style={styles.callButtonText as StyleProp<TextStyle>}>📞</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Swipe to Mark Safe */}
            <View style={styles.swipeContainer as StyleProp<ViewStyle>}>
              <View style={styles.swipeTrack as StyleProp<ViewStyle>}>
                <Text style={styles.swipeText as StyleProp<TextStyle>}>
                  ←  SWIPE TO MARK YOURSELF AS SAFE
                </Text>
                <Animated.View
                  style={[
                    styles.swipeHandle as StyleProp<ViewStyle>,
                    {
                      transform: [{ translateX: swipeAnim }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <Text style={styles.swipeHandleText as StyleProp<TextStyle>}>▶▶</Text>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 0,
  },
  // Emergency Screen Styles
  emergencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  emergencyScreen: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emergencyHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.3,
  },
  locationIndicator: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  emergencySOSContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  rippleRing1: {
    width: 140,
    height: 140,
  },
  rippleRing2: {
    width: 180,
    height: 180,
  },
  rippleRing3: {
    width: 220,
    height: 220,
  },
  emergencySOSButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  emergencySOSText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  timerLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  timerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  timerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d97706',
  },
  contactCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  contactHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactBody: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 3,
  },
  contactRelation: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  callButtonText: {
    fontSize: 22,
  },
  swipeContainer: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  swipeTrack: {
    height: 64,
    backgroundColor: '#22c55e',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  swipeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  swipeHandle: {
    position: 'absolute',
    left: 6,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  swipeHandleText: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: 'bold',
  },
});