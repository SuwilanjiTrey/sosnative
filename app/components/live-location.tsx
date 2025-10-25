// app/live-location.tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyledText } from '../../components/StyledText';
import { auth, db } from '../../firebaseConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  GeoPoint,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { getCurrentLocation } from '../utils/location';

// Define types
type CircleMember = {
  id: string;
  name: string;
  mobileNumber: string;
  category: string;
  isRegistered: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  profilePictureBase64?: string;
  userId?: string; // Add userId to link to recorded_locations
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

type NearbyService = {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'fire';
  latitude: number;
  longitude: number;
  distance: number;
  address: string;
  phone: string;
};

export default function LiveLocationScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [memberLocations, setMemberLocations] = useState<RecordedLocation[]>([]);
  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get user's premium status and circle members on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Get user data to check premium status
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsPremium(userData.isPremium || false);
        }
        
        await fetchCircleMembersAndLocations();
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
  
    fetchUserData();
  }, []);

  // Track user location and update/create record
  useEffect(() => {
    const trackUserLocation = async () => {
      if (!auth.currentUser?.uid) return;
      
      try {
        const location = await getCurrentLocation();
        
        if (!location) {
          Alert.alert("Error", "Could not get your current location");
          return;
        }
  
        setUserLocation({ lat: location.lat, lng: location.lng });
  
        // Update or create location record for current user
        await updateUserLocationRecord(location.lat, location.lng, location.accuracy ?? 0);
        
        console.log("Location tracked successfully");
        
        // Refresh circle members and their locations
        await fetchCircleMembersAndLocations();
        
        // If premium, fetch nearby services
        if (isPremium) {
          fetchNearbyServices(location.lat, location.lng);
        }
      } catch (error) {
        console.error("Error tracking location:", error);
      } finally {
        setLoadingLocation(false);
      }
    };
  
    trackUserLocation();
  }, [isPremium]);

  // Update or create user location record
  const updateUserLocationRecord = async (lat: number, lng: number, accuracy: number | null) => {
    if (!auth.currentUser?.uid) return;

    try {
      const locationData = {
        userId: auth.currentUser.uid,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ?? 0,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      // Check if user already has a location record
      const locationsQuery = query(
        collection(db, 'recorded_locations'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const locationsSnapshot = await getDocs(locationsQuery);

      if (!locationsSnapshot.empty) {
        // Update existing record
        const docRef = locationsSnapshot.docs[0].ref;
        await updateDoc(docRef, locationData);
        console.log("Updated existing location record");
      } else {
        // Create new record
        await addDoc(collection(db, 'recorded_locations'), locationData);
        console.log("Created new location record");
      }
    } catch (error) {
      console.error("Error updating location record:", error);
    }
  };

  // Fetch circle members and their locations
  const fetchCircleMembersAndLocations = async () => {
    if (!auth.currentUser?.uid) return;
    
    try {
      console.log("Fetching circle members for user:", auth.currentUser.uid);
      
      // Fetch circle members
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
      setCircleMembers(members);
      
      // Now fetch user IDs for these phone numbers from users collection
      if (members.length > 0) {
        const userIdsMap: Record<string, string> = {};
        
        // Query users collection to match phone numbers to UIDs
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.mobileNumber && memberPhoneNumbers.includes(userData.mobileNumber)) {
            userIdsMap[userData.mobileNumber] = doc.id;
          }
        });
        
        console.log("User IDs map:", userIdsMap);
        
        // Update members with their UIDs
        const membersWithIds = members.map(member => ({
          ...member,
          userId: userIdsMap[member.mobileNumber]
        }));
        
        setCircleMembers(membersWithIds);
        
        // Fetch locations for users who have UIDs
        const validUserIds = Object.values(userIdsMap).filter(id => id);
        
        if (validUserIds.length > 0) {
          console.log("Fetching locations for user IDs:", validUserIds);
          
          // Firestore 'in' queries are limited to 10 items, so we need to batch
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
          
          // Get latest location per user
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

  // Fetch nearby services (mock data - replace with real API)
  const fetchNearbyServices = async (lat: number, lng: number) => {
    if (!isPremium) return;
    
    setLoadingServices(true);
    try {
      // Mock data for nearby emergency services
      // In production, use Google Places API or similar
      const mockServices: NearbyService[] = [
        {
          id: '1',
          name: 'Central Police Station',
          type: 'police',
          latitude: lat + 0.005,
          longitude: lng + 0.005,
          distance: 550,
          address: 'Cairo Road, Lusaka',
          phone: '991'
        },
        {
          id: '2',
          name: 'University Teaching Hospital',
          type: 'hospital',
          latitude: lat - 0.008,
          longitude: lng + 0.003,
          distance: 890,
          address: 'Nationalist Road, Lusaka',
          phone: '993'
        },
        {
          id: '3',
          name: 'Lusaka Fire Station',
          type: 'fire',
          latitude: lat + 0.003,
          longitude: lng - 0.006,
          distance: 670,
          address: 'Independence Avenue, Lusaka',
          phone: '992'
        },
        {
          id: '4',
          name: 'Levy Mwanawasa Hospital',
          type: 'hospital',
          latitude: lat - 0.012,
          longitude: lng - 0.004,
          distance: 1340,
          address: 'Chilimbulu Road, Lusaka',
          phone: '0211-253-777'
        }
      ];
      
      setNearbyServices(mockServices);
    } catch (error) {
      console.error("Error fetching nearby services:", error);
    } finally {
      setLoadingServices(false);
    }
  };

  // Generate HTML for the map with proper icons
  const generateMapHTML = () => {
    const centerLat = userLocation?.lat || -15.3875;
    const centerLon = userLocation?.lng || 28.3228;
    
    // Filter members based on selected category
    const filteredMembers = selectedCategory 
      ? circleMembers.filter(m => m.category === selectedCategory)
      : circleMembers;
    
    // Get locations for filtered members
    const filteredLocations = memberLocations.filter(loc => 
      filteredMembers.some(m => m.userId === loc.userId)
    );
    
    // Define marker type
    type MapMarker = {
      lat: number;
      lng: number;
      name: string;
      color: string;
      icon: string;
      type: string;
      category?: string;
      phone?: string;
      address?: string;
      distance?: number;
    };
    
    // Create markers array
    const allMarkers: MapMarker[] = [
      ...(userLocation ? [{
        lat: userLocation.lat,
        lng: userLocation.lng,
        name: 'You',
        color: '#d32f2f',
        icon: '📍',
        type: 'user'
      }] : []),
      ...filteredLocations.map(location => {
        const member = circleMembers.find(m => m.userId === location.userId);
        return {
          lat: location.latitude,
          lng: location.longitude,
          name: member ? member.name : 'Unknown',
          color: '#2196f3',
          icon: '👤',
          type: 'member',
          category: member?.category || 'Unknown'
        };
      }),
      ...(isPremium ? nearbyServices.map(service => ({
        lat: service.latitude,
        lng: service.longitude,
        name: service.name,
        color: service.type === 'police' ? '#4CAF50' : 
               service.type === 'hospital' ? '#F44336' : '#FF9800',
        icon: service.type === 'police' ? '🚓' : 
              service.type === 'hospital' ? '🏥' : '🚒',
        type: service.type,
        phone: service.phone,
        address: service.address,
        distance: service.distance
      })) : [])
    ];

    const markersJS = allMarkers.map((marker, index) => `
      L.marker([${marker.lat}, ${marker.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: \`
            <div style="
              position: relative;
              width: 40px;
              height: 50px;
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              <div style="
                background-color: ${marker.color};
                width: 35px;
                height: 35px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="
                  transform: rotate(45deg);
                  font-size: 18px;
                  line-height: 1;
                ">${marker.icon}</span>
              </div>
              <div style="
                background: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                color: #333;
                margin-top: 2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                white-space: nowrap;
                max-width: 80px;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${marker.name}</div>
            </div>
          \`,
          iconSize: [40, 50],
          iconAnchor: [20, 50]
        })
      }).addTo(map).bindPopup(
        '<div style="min-width: 200px;">' +
          '<h3 style="margin: 0 0 8px 0; font-size: 16px;">${marker.icon} ${marker.name}</h3>' +
          '<p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Type:</strong> ${marker.type}</p>' +
          ${marker.category ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Category:</strong> ${marker.category}</p>'" : "''"} +
          ${marker.phone ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Phone:</strong> ${marker.phone}</p>'" : "''"} +
          ${marker.address ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Address:</strong> ${marker.address}</p>'" : "''"} +
          ${marker.distance ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #2196f3;\"><strong>Distance:</strong> ${marker.distance}m away</p>'" : "''"} +
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
          // Fit bounds to show all markers
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

  const handleRecordLocation = async () => {
    if (!auth.currentUser?.uid) {
      Alert.alert("Error", "You must be logged in to record location");
      return;
    }
  
    setIsRecording(true);
    
    try {
      const location = await getCurrentLocation();
      
      if (!location) {
        Alert.alert("Error", "Could not get your current location");
        return;
      }
  
      setUserLocation({ lat: location.lat, lng: location.lng });
      
      await updateUserLocationRecord(location.lat, location.lng, location.accuracy ?? 0);
      
      // Refresh circle members and their locations
      await fetchCircleMembersAndLocations();
      
      // If premium, refresh nearby services
      if (isPremium) {
        fetchNearbyServices(location.lat, location.lng);
      }
      
      Alert.alert(
        "Success",
        `Location updated successfully!\n\nLat: ${location.lat.toFixed(6)}\nLng: ${location.lng.toFixed(6)}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error recording location:", error);
      Alert.alert("Error", "Failed to record location. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation({ lat: location.lat, lng: location.lng });
        
        if (auth.currentUser?.uid) {
          await updateUserLocationRecord(location.lat, location.lng, location.accuracy ?? 0);
        }
      }
      
      await fetchCircleMembersAndLocations();
      
      if (isPremium && location) {
        fetchNearbyServices(location.lat, location.lng);
      }
      
    } catch (error) {
      console.error("Error refreshing location:", error);
      Alert.alert("Error", "Failed to refresh location");
    } finally {
      setRefreshing(false);
    }
  };

  const renderMapView = () => {
    if (loadingLocation) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#d32f2f" />
            <Text style={styles.mapLoadingText}>Getting your location...</Text>
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
          
          {/* Locate Me Button for Web */}
          <TouchableOpacity 
            style={styles.locateMeButton}
            onPress={handleRecordLocation}
            disabled={isRecording}
          >
            {isRecording ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.locateMeText}>Locate Me</Text>
              </>
            )}
          </TouchableOpacity>
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
          
          <TouchableOpacity 
            style={styles.locateMeButton}
            onPress={handleRecordLocation}
            disabled={isRecording}
          >
            {isRecording ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.locateMeText}>Locate Me</Text>
              </>
            )}
          </TouchableOpacity>

         
        </View>
      );
    }
  };

  const renderCircleCards = () => {
    const groupedMembers = circleMembers.reduce((acc, member) => {
      if (!acc[member.category]) acc[member.category] = [];
      acc[member.category].push(member);
      return acc;
    }, {} as Record<string, CircleMember[]>);

    return Object.entries(groupedMembers).map(([category, members]) => {
      // Count how many members have locations
      const membersWithLocations = members.filter(m => 
        memberLocations.some(loc => loc.userId === m.userId)
      ).length;

      return (
        <TouchableOpacity 
          key={category} 
          style={[
            styles.circleCard, 
            selectedCategory === category && styles.circleCardSelected
          ]}
          onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
        >
          <View style={styles.circleHeader}>
            <Text style={styles.circleName}>{category}</Text>
            <Text style={styles.circleMembers}>
              {members.length} Members • {membersWithLocations} with location
            </Text>
          </View>
          <View style={styles.avatarsRow}>
            {members.slice(0, 3).map((member) => (
              <View key={member.id} style={[
                styles.avatar,
                memberLocations.some(loc => loc.userId === member.userId) && styles.avatarActive
              ]}>
                <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
              </View>
            ))}
            {members.length > 3 && (
              <View style={styles.avatarMoreBadge}>
                <Text style={styles.avatarMoreText}>+{members.length - 3}</Text>
              </View>
            )}
          </View>
          {selectedCategory === category && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={20} color="#d32f2f" />
              <Text style={styles.selectedText}>Showing on map</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });
  };

  const renderNearbyServices = () => {
    if (!isPremium) return null;
    
    return (
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>Nearby Emergency Services</Text>
        {loadingServices ? (
          <ActivityIndicator size="small" color="#d32f2f" />
        ) : (
          nearbyServices.map(service => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceEmoji}>
                  {service.type === 'police' ? '🚓' : 
                   service.type === 'hospital' ? '🏥' : '🚒'}
                </Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceType}>{service.type}</Text>
                <Text style={styles.serviceDistance}>{service.distance}m away</Text>
                <Text style={styles.serviceAddress}>{service.address}</Text>
              </View>
              <TouchableOpacity 
                style={styles.serviceCallButton}
                onPress={() => {
                  Alert.alert(
                    "Call " + service.name,
                    "Do you want to call " + service.name + "?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Call", onPress: () => console.log("Calling " + service.phone) }
                    ]
                  );
                }}
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Location</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} disabled={refreshing}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#ccc" : "#2196f3"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d32f2f']}
            tintColor="#d32f2f"
            title="Pull to refresh location..."
            titleColor="#666"
          />
        }
      >
        <View style={styles.mapSection}>
          {renderMapView()}
        </View>

        <View style={styles.contentSection}>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.premiumText}>Premium User</Text>
            </View>
          )}

          <Text style={styles.subtitle}>
            {isPremium 
              ? "View your circle members and nearby emergency services" 
              : "Select a circle category to view member locations"}
          </Text>

          <View style={styles.circlesSection}>
            {circleMembers.length > 0 ? (
              renderCircleCards()
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.noMembersText}>No circle members found</Text>
                <Text style={styles.noMembersSubtext}>
                  Add members to your circle to see their locations
                </Text>
              </View>
            )}
          </View>

          {renderNearbyServices()}

          <TouchableOpacity 
            style={[styles.sosButton, !isPremium && styles.sosButtonDisabled]}
            onPress={() => {
              if (isPremium) {
                Alert.alert(
                  "SOS Emergency",
                  "Are you sure you want to send an emergency alert to your circle and nearby services?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Send Alert", style: "destructive", onPress: () => console.log("SOS alert sent") }
                  ]
                );
              } else {
                Alert.alert(
                  "Premium Feature",
                  "Upgrade to Premium to use SOS Emergency alerts",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Upgrade", onPress: () => router.push('./premium') }
                  ]
                );
              }
            }}
          >
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.sosButtonText}>
              {isPremium ? "SOS Emergency" : "Upgrade for SOS"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  mapSection: {
    height: 350,
    width: '100%',
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
  backButtonOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locateMeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196f3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 6,
    zIndex: 1000,
  },
  locateMeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  contentSection: {
    padding: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8F00',
    marginLeft: 4,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  circlesSection: {
    marginBottom: 24,
  },
  circleCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  circleCardSelected: {
    borderColor: '#d32f2f',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  circleHeader: {
    marginBottom: 12,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  circleMembers: {
    fontSize: 12,
    color: '#999',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  avatarMoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196f3',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedText: {
    fontSize: 12,
    color: '#d32f2f',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMembersText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  noMembersSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  serviceDistance: {
    fontSize: 12,
    color: '#2196f3',
    marginBottom: 2,
    fontWeight: '500',
  },
  serviceAddress: {
    fontSize: 11,
    color: '#999',
  },
  serviceCallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 10,
    marginTop: 8,
  },
  sosButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});