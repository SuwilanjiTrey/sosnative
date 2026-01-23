// app/(tabs)/dashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, StatusBar, Animated, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import SOSButton from '../components/SOSButton';
import { useAuth } from '../../hooks/useAuth';
import { StyledText } from '../../components/StyledText';
import { doc, getDoc, collection, getDocs, onSnapshot, query, where, orderBy, GeoPoint, updateDoc, limit, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { getCurrentLocation } from '../utils/location';

// Configure notifications with updated API
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: false, // Deprecated in favor of shouldShowBanner
  }),
});

type CircleCategory = 'Sibling' | 'Friends' | 'Family' | 'Emergency' | 'Other';

type CircleData = {
  id: string;
  category: CircleCategory;
  memberCount: number;
  avatars: string[];
  initials: string[];
  hasEmergency?: boolean;
  emergencyMemberId?: string;
  emergencyMemberName?: string;
};

type Notification = {
  id: string;
  type: 'circle_invitation' | 'sos_alert';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  fromUserName?: string;
  fromUserId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  information?: string;
};

type RecordedLocation = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: any;
  createdAt: string;
};

// Add this type definition to dashboard.tsx if it doesn't exist
type CircleMember = {
  id: string;
  name: string;
  mobileNumber: string;
  category: string;
  isRegistered: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  profilePictureBase64?: string;
  userId?: string;
};

export default function DashboardScreen() {
  const { user } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [sosAlerts, setSosAlerts] = useState<Notification[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [memberLocations, setMemberLocations] = useState<RecordedLocation[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const router = useRouter();
  const lastNotificationCount = useRef(0);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    };
    requestPermissions();
  }, []);

  // Pulse animation for emergency alerts
  useEffect(() => {
    if (sosAlerts.length > 0) {
      // Start pulsing animation for emergency
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [sosAlerts.length]);


  // Add this to your useEffect hooks in dashboard.tsx
useEffect(() => {
  if (!user) return;
  
  fetchCircleMembersAndLocations();
}, [user]);


const fetchCircleMembersAndLocations = async () => {
  if (!auth.currentUser?.uid) return;
  
  try {
    console.log("Fetching circle members for user:", auth.currentUser.uid);
    
    const circlesRef = collection(db, 'users', auth.currentUser.uid, 'circles');
    const circlesSnapshot = await getDocs(circlesRef);
    
    console.log("Circles snapshot size:", circlesSnapshot.size);
    
    const members: CircleMember[] = [];
    const memberPhoneNumbers: string[] = [];
    
    circlesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log("Circle member data:", data);
      
      if (data.status === 'accepted') {
        members.push({
          id: doc.id,
          name: data.name,
          mobileNumber: data.mobileNumber,
          category: data.category,
          isRegistered: data.isRegistered,
          status: data.status,
          profilePictureBase64: data.profilePictureBase64
        });
        memberPhoneNumbers.push(data.mobileNumber);
      }
    });
    
    console.log("Processed members:", members.length);
    
    if (members.length > 0) {
      const userIdsMap: Record<string, string> = {};
      
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.mobileNumber && memberPhoneNumbers.includes(userData.mobileNumber)) {
          userIdsMap[userData.mobileNumber] = doc.id;
        }
      });
      
      console.log("User IDs map:", userIdsMap);
      
      const membersWithIds = members.map(member => ({
        ...member,
        userId: userIdsMap[member.mobileNumber]
      }));
      
      // Store the full member details for use in the map
      setCircleMembers(membersWithIds);
      
      const validUserIds = Object.values(userIdsMap).filter(id => id);
      
      if (validUserIds.length > 0) {
        console.log("Fetching locations for user IDs:", validUserIds);
        
        const batches = [];
        for (let i = 0; i < validUserIds.length; i += 10) {
          const batch = validUserIds.slice(i, i + 10);
          const locationsQuery = query(
            collection(db, 'recorded_locations'),
            where('userId', 'in', batch),
            orderBy('timestamp', 'desc')
          );
          batches.push(getDocs(locationsQuery));
        }
        
        const allSnapshots = await Promise.all(batches);
        
        const latestLocations: Record<string, RecordedLocation> = {};
        
        allSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            const data = doc.data();
            const userId = data.userId;
            
            if (!latestLocations[userId] || 
                data.timestamp.toMillis() > latestLocations[userId].timestamp.toMillis()) {
              latestLocations[userId] = {
                id: doc.id,
                userId: data.userId,
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy,
                timestamp: data.timestamp,
                createdAt: data.createdAt
              };
            }
          });
        });
        
        console.log("Latest locations found:", Object.keys(latestLocations).length);
        setMemberLocations(Object.values(latestLocations));
      }
    }
  } catch (error) {
    console.error("Error fetching circle members and locations:", error);
    Alert.alert("Error", "Failed to fetch circle members and locations");
  }
};


  // Function to show system notification
  const showSystemNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // Get user's location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (location) {
          setUserLocation({ lat: location.lat, lng: location.lng });
          
          // Update location in database
          if (user?.uid) {
            const locationData = {
              userId: user.uid,
              latitude: location.lat,
              longitude: location.lng,
              accuracy: location.accuracy ?? 0,
              timestamp: new Date(),
              createdAt: new Date().toISOString()
            };
            
            // This is a simplified version - you might want to use your existing updateUserLocationRecord function
            try {
              const locationsQuery = query(
                collection(db, 'recorded_locations'),
                where('userId', '==', user.uid),
                orderBy('timestamp', 'desc'),
                limit(1)
              );
              
              const locationsSnapshot = await getDocs(locationsQuery);
              
              if (!locationsSnapshot.empty) {
                const docRef = locationsSnapshot.docs[0].ref;
                await updateDoc(docRef, locationData);
              } else {
                await addDoc(collection(db, 'recorded_locations'), locationData);
              }
            } catch (error) {
              console.error("Error updating location record:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error getting user location:", error);
      } finally {
        setLoadingLocation(false);
      }
    };
    
    getUserLocation();
  }, [user]);

  // Fetch circle member locations
  useEffect(() => {
    if (!user) return;
    
    const fetchMemberLocations = async () => {
      try {
        const circlesRef = collection(db, 'users', user.uid, 'circles');
        const circlesSnapshot = await getDocs(circlesRef);
        
        const memberPhoneNumbers: string[] = [];
        
        circlesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'accepted') {
            memberPhoneNumbers.push(data.mobileNumber);
          }
        });
        
        if (memberPhoneNumbers.length > 0) {
          const userIdsMap: Record<string, string> = {};
          
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.mobileNumber && memberPhoneNumbers.includes(userData.mobileNumber)) {
              userIdsMap[userData.mobileNumber] = doc.id;
            }
          });
          
          const validUserIds = Object.values(userIdsMap).filter(id => id);
          
          if (validUserIds.length > 0) {
            const batches = [];
            for (let i = 0; i < validUserIds.length; i += 10) {
              const batch = validUserIds.slice(i, i + 10);
              const locationsQuery = query(
                collection(db, 'recorded_locations'),
                where('userId', 'in', batch),
                orderBy('timestamp', 'desc')
              );
              batches.push(getDocs(locationsQuery));
            }
            
            const allSnapshots = await Promise.all(batches);
            
            const latestLocations: Record<string, RecordedLocation> = {};
            
            allSnapshots.forEach(snapshot => {
              snapshot.forEach(doc => {
                const data = doc.data();
                const userId = data.userId;
                
                if (!latestLocations[userId] || 
                    data.timestamp.toMillis() > latestLocations[userId].timestamp.toMillis()) {
                  latestLocations[userId] = {
                    id: doc.id,
                    userId: data.userId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accuracy: data.accuracy,
                    timestamp: data.timestamp,
                    createdAt: data.createdAt
                  };
                }
              });
            });
            
            setMemberLocations(Object.values(latestLocations));
          }
        }
      } catch (error) {
        console.error("Error fetching member locations:", error);
      }
    };
    
    fetchMemberLocations();
  }, [user]);

  // Set up real-time listener for circles with SOS status
  useEffect(() => {
    if (!user) return;

    const circlesRef = collection(db, 'users', user.uid, 'circles');
    const unsubscribe = onSnapshot(circlesRef, (snapshot) => {
      // Group circles by category
      const groupedByCategory: Record<CircleCategory, any[]> = {
        Sibling: [],
        Friends: [],
        Family: [],
        Emergency: [],
        Other: [],
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category: CircleCategory = data.category || 'Other';
        groupedByCategory[category].push({
          ...data,
          id: doc.id,
        });
      });

      // Transform grouped data into circle cards
      const circleCards: CircleData[] = Object.entries(groupedByCategory)
        .filter(([_, members]) => members.length > 0)
        .map(([category, members]) => {
          const firstThree = members.slice(0, 3);
          
          // Check if any member has an active emergency
          const emergencyMember = members.find(m => m.hasActiveEmergency === true);
          
          return {
            id: category,
            category: category as CircleCategory,
            memberCount: members.length,
            avatars: firstThree.map(member => member.profilePictureBase64),
            initials: firstThree.map(member => member.name.charAt(0).toUpperCase()),
            hasEmergency: !!emergencyMember,
            emergencyMemberId: emergencyMember?.id,
            emergencyMemberName: emergencyMember?.name,
          };
        });

      setCircles(circleCards);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to circles:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Set up real-time listener for notifications (including SOS alerts)
  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let pendingCount = 0;
      const sosAlertsList: Notification[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as Notification;
        if (data.status === 'pending') {
          pendingCount++;
        }
        
        // Track SOS alerts separately
        if (data.type === 'sos_alert' && data.status === 'pending') {
          sosAlertsList.push({
            id: doc.id,
            ...data,
          });
        }
      });
      
      setUnreadNotifications(pendingCount);
      setSosAlerts(sosAlertsList);
      
      // Play sound if new notifications arrived
      if (pendingCount > lastNotificationCount.current) {
        playNotificationSound();
        
        // Show system notification for new alerts
        if (sosAlertsList.length > 0) {
          showSystemNotification(
            'Emergency Alert',
            `${sosAlertsList[0].fromUserName} needs help!`,
            { type: 'sos_alert', notificationId: sosAlertsList[0].id }
          );
        } else {
          // Check if there are new circle invitations
          const newInvitations = snapshot.docs
            .map(doc => doc.data() as Notification)
            .filter(n => n.type === 'circle_invitation' && n.status === 'pending');
          
          if (newInvitations.length > 0) {
            showSystemNotification(
              'Circle Invitation',
              `${newInvitations[0].fromUserName} invited you to their circle`,
              { type: 'circle_invitation', notificationId: newInvitations[0].id }
            );
          }
        }
      }
      
      lastNotificationCount.current = pendingCount;
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
  
    setupAudio();
  }, []);

  // Function to play notification sound
  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification-chime.mp3')
      );
      await sound.playAsync();
      
      // Clean up sound after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

// Replace the existing generateMapHTML function in dashboard.tsx with this updated version
const generateMapHTML = () => {
  // Determine map center
  let centerLat: number;
  let centerLon: number;
  
  if (userLocation) {
    // Center on user location
    centerLat = userLocation.lat;
    centerLon = userLocation.lng;
  } else {
    // Default center (Lusaka)
    centerLat = -15.3875;
    centerLon = 28.3228;
  }
  
  type MapMarker = {
    lat: number;
    lng: number;
    name: string;
    color: string;
    icon: string;
    type: string;
    profilePicture?: string;
    category?: string;
  };
  
  const allMarkers: MapMarker[] = [];
  
  // Add current user location with profile picture
  if (userLocation) {
    allMarkers.push({
      lat: userLocation.lat,
      lng: userLocation.lng,
      name: 'You',
      color: '#d32f2f',
      icon: '📍',
      type: 'user',
      profilePicture: userData?.profilePictureBase64
    });
  }
  
  allMarkers.push(...memberLocations.map(location => {
    // Find the member associated with this location
    const member = circleMembers.find(m => m.userId === location.userId);
    
    return {
      lat: location.latitude,
      lng: location.longitude,
      name: member ? member.name : 'Unknown',
      color: '#2196f3',
      icon: '👤',
      type: 'member',
      profilePicture: member?.profilePictureBase64,
      category: member?.category || 'Unknown'
    };
  }));

  const markersJS = allMarkers.map((marker, index) => `
    L.marker([${marker.lat}, ${marker.lng}], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: \`
          <div style="
            position: relative;
            width: 45px;
            height: 55px;
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              background-color: ${marker.color};
              width: 40px;
              height: 40px;
              border-radius: 50%;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            ">
              ${marker.profilePicture ? 
                `<img src="${marker.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg);" />` :
                `<span style="transform: rotate(45deg); font-size: 18px; line-height: 1;">${marker.icon}</span>`
              }
            </div>
            <div style="
              background: white;
              color: #333;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              margin-top: 2px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              white-space: nowrap;
              max-width: 100px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${marker.name}</div>
          </div>
        \`,
        iconSize: [45, 55],
        iconAnchor: [22, 55]
      })
    }).addTo(map).bindPopup(
      '<div style="min-width: 200px;">' +
        '<h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">${marker.icon} ${marker.name}</h3>' +
        '<p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Type:</strong> ${marker.type}</p>' +
        ${marker.category ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Category:</strong> ${marker.category}</p>'" : "''"} +
        '<p style="margin: 4px 0; font-size: 11px; color: #999;">${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}</p>' +
      '</div>'
    );
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .custom-marker { background: transparent; border: none; }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${centerLat}, ${centerLon}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        ${markersJS}

        ${allMarkers.length > 0 ? `
        var bounds = L.latLngBounds([
          ${allMarkers.map(m => `[${m.lat}, ${m.lng}]`).join(',\n            ')}
        ]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        ` : ''}
      </script>
    </body>
    </html>
  `;
};

  // Function to render the map
  const renderMapView = () => {
    if (loadingLocation) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#d32f2f" />
            <Text style={styles.mapLoadingText}>Getting location...</Text>
          </View>
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapContainer}>
          <iframe
            srcDoc={generateMapHTML()}
            style={styles.mapIframe}
            title="Live Location Map"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
          />
        </View>
      );
    } else {
      return (
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: generateMapHTML() }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#d32f2f" />
              </View>
            )}
          />
        </View>
      );
    }
  };

  const getImageSource = () => {
    if (userData?.profilePictureBase64) {
      return { uri: userData.profilePictureBase64 };
    }
    return { uri: user?.photoURL || 'https://i.pravatar.cc/150?img=10' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={getImageSource()}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {userData?.name || user?.displayName || 'User'}
            </Text>
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="shield-checkmark" size={14} color="#4caf50" />
              <Text style={styles.premiumTextSmall}>
                {userData?.isPremium ? 'Premium user' : 'Basic Plan'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('../components/notification')}
          style={styles.notificationButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#333" />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* HBox for Location and Emergency Alerts */}
      <View style={styles.infoHBox}>
        {/* Current Location Component */}
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => router.push('../components/live-location')}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name="locate" size={20} color="#2196f3" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationText}>Current location: {userData?.currentTown || 'null'}, { userData?.currentCity ||'Unknown' }</Text>
            <Text style={styles.locationSubtext}>Tap to view live location</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Emergency Alert Icon - Simplified to just an icon */}
        {sosAlerts.length > 0 && (
          <TouchableOpacity 
            style={styles.emergencyAlertIcon}
            onPress={() => router.push('../components/notification')}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.emergencyAlertIconInner,
              {
                transform: [{ scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }) }],
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.8],
                })
              }
            ]}>
              <Ionicons name="warning" size={24} color="#fff" />
              {sosAlerts.length > 1 && (
                <View style={styles.emergencyAlertCount}>
                  <Text style={styles.emergencyAlertCountText}>{sosAlerts.length}</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Emergency Circle Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Circle</Text>
            <TouchableOpacity
              onPress={() => router.push('./circle')}
              activeOpacity={0.7}
            >
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {circles.length === 0 ? (
            <View style={styles.emptyCirclesContainer}>
              <Text style={styles.emptyCirclesText}>No emergency circles yet. Add members to get started!</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              {circles.map(circle => (
                <CircleCardComponent 
                  key={circle.id} 
                  circle={circle}
                  onPress={() => router.push('./circle')}
                />
              ))}
              
              <TouchableOpacity 
                style={styles.addCircleButton}
                onPress={() => router.push('./circle')}
              >
                <View style={styles.addCircleIcon}>
                  <Ionicons name="add" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.addCircleCount}>+Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Map Section - Added from live-location.tsx */}
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Circle Locations</Text>
            <TouchableOpacity
              onPress={() => router.push('../components/live-location')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewFullMapText}>View Full Map</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapWrapper}>
            {renderMapView()}
          </View>
        </View>
      </ScrollView>

      {/* SOS Button - Moved to bottom */}
      <View style={styles.sosContainer}>
        <SOSButton onSOSTriggered={() => {}} />
      </View>
    </View>
  );
}





// Circle Card Component with Emergency Animation
function CircleCardComponent({ 
  circle, 
  onPress 
}: { 
  circle: CircleData;
  onPress: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (circle.hasEmergency) {
      // Start pulsing animation for emergency
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [circle.hasEmergency]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fee2e2', '#fecaca'],
  });

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ef4444', '#dc2626'],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View 
        style={[
          circleCardStyles.card,
          circle.hasEmergency && {
            backgroundColor: backgroundColor,
            borderWidth: 2,
            borderColor: borderColor,
          }
        ]}
      >
        {circle.hasEmergency && (
          <View style={circleCardStyles.emergencyBadge}>
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={circleCardStyles.emergencyBadgeText}> EMERGENCY</Text>
          </View>
        )}
        
        <Text style={circleCardStyles.title}>{circle.category}</Text>
        <Text style={[
          circleCardStyles.memberCount,
          circle.hasEmergency && circleCardStyles.emergencyText
        ]}>
          {circle.memberCount} Members
        </Text>
        
        {circle.hasEmergency && (
          <Text style={circleCardStyles.emergencyMemberName}>
            {circle.emergencyMemberName} needs help!
          </Text>
        )}
        
        <View style={circleCardStyles.avatarsContainer}>
          {circle.avatars.map((avatar, index) => (
            <View key={index} style={[
              circleCardStyles.avatar, 
              { marginLeft: index > 0 ? -10 : 0 },
              circle.hasEmergency && circleCardStyles.emergencyAvatarBorder
            ]}>
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={circleCardStyles.avatarImage}
                />
              ) : (
                <View style={circleCardStyles.initialsContainer}>
                  <Text style={circleCardStyles.initialText}>{circle.initials[index]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const circleCardStyles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  emergencyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  emergencyText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  emergencyMemberName: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  emergencyAvatarBorder: {
    borderColor: '#dc2626',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumTextSmall: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // HBox for Location and Emergency Alerts
  infoHBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 80, // Minimum height to accommodate both components
  },
  // Location Component Styles - Adjusted for HBox layout
  locationContainer: {
    flex: 1, // This makes the location component take up available space
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginRight: 8, // Space between location and emergency alert
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // To adjust the width of the location component, modify the flex property above:
  // - For a wider location component: increase the flex value (e.g., flex: 2)
  // - For a narrower location component: decrease the flex value (e.g., flex: 0.8)
  // - For a fixed width: replace flex: 1 with width: 200 (or any desired value)
  
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationSubtext: {
    fontSize: 13,
    color: '#666',
  },
  // Emergency Alert Icon - Simplified to just an icon
  emergencyAlertIcon: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyAlertIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emergencyAlertCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  emergencyAlertCountText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  manageText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCirclesContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  emptyCirclesText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addCircleButton: {
    width: 80,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  addCircleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCircleCount: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
  },
  // Map section styles
  mapSection: {
    paddingHorizontal: 20,
    //marginBottom: 0, // Add space for the SOS button at the bottom
  },

  // Add padding to the ScrollView to ensure content doesn't get hidden behind the SOS button
scrollView: {
  flex: 1,
  paddingBottom: 80, // Add this to create space for the SOS button
},
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  viewFullMapText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '600',
  },
  mapWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  webView: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  // SOS button container - positioned at the bottom
  sosContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    height:180,
  },
});