// app/components/live-location.tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,Image, Platform, ScrollView, RefreshControl, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import React from 'react';

// Define types
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

type UserData = {
  name?: string;
  isPremium?: boolean;
  profilePictureBase64?: string;
  [key: string]: any;
};

export default function LiveLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract parameters for SOS emergency viewing
  const focusUserId = params.focusUserId as string | undefined;
  const focusUserName = params.focusUserName as string | undefined;
  const focusLat = params.focusLat ? parseFloat(params.focusLat as string) : undefined;
  const focusLng = params.focusLng ? parseFloat(params.focusLng as string) : undefined;
  const isEmergencyView = params.isEmergency === 'true';
  
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
  const [initialized, setInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // NEW: Routing states
  const [showRoute, setShowRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Debug logging for parameters
  useEffect(() => {
    console.log('LiveLocationScreen initialized with params:', {
      focusUserId,
      focusUserName,
      focusLat,
      focusLng,
      isEmergencyView
    });
    setInitialized(true);
  }, []);

  // Get user's premium status and circle members on component mount
  useEffect(() => {
    if (!initialized) return;
    
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        console.log("No authenticated user found");
        setLoadingLocation(false);
        return;
      }
      
      try {
        console.log("Fetching user data for:", auth.currentUser.uid);
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserData(userData);
          setIsPremium(userData.isPremium || false);
          console.log("User premium status:", userData.isPremium);
        }
        
        await fetchCircleMembersAndLocations();
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoadingLocation(false);
      }
    };
  
    fetchUserData();
  }, [initialized]);

  // Initial location tracking on mount (non-emergency)
  useEffect(() => {
    if (!initialized || isEmergencyView) return;
    
    updateLocation(); // Initial update
  }, [initialized, isEmergencyView]);

  // Auto-update every 30 minutes while screen is active (non-emergency)
  useEffect(() => {
    if (!initialized || isEmergencyView) return;

    const intervalId = setInterval(() => {
      updateLocation();
    }, AUTO_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [initialized, isEmergencyView, isPremium, userLocation]);

  // Emergency view setup
  useEffect(() => {
    if (isEmergencyView && focusLat && focusLng) {
      console.log("Emergency view detected, setting focus location from params");
      
      // Still fetch circle members to show on map
      fetchCircleMembersAndLocations();
      
      // Try to get user's actual location for routing
      const getUserLocationForEmergency = async () => {
        try {
          const { getCurrentLocation } = require('../utils/location');
          const location = await getCurrentLocation();
          
          if (location) {
            console.log("Got user location for emergency view:", location);
            setUserLocation({ lat: location.lat, lng: location.lng });
          } else {
            console.log("Could not get user location, emergency marker only");
          }
        } catch (error) {
          console.error("Error getting location for emergency:", error);
        } finally {
          setLoadingLocation(false);
        }
      };
      
      getUserLocationForEmergency();
    }
  }, [isEmergencyView, focusLat, focusLng]);

  // Function to update location, Firestore, and related data
  const updateLocation = async () => {
    if (!auth.currentUser?.uid) return;

    try {
      console.log("Getting current location...");
      
      // First check if location services are enabled
      const { getCurrentLocation } = require('../utils/location');
      const location = await getCurrentLocation();
      
      if (!location) {
        Alert.alert(
          "Location Error", 
          "Could not get your current location. Please ensure:\n\n" +
          "1. Location services are enabled on your device\n" +
          "2. You've granted location permissions to this app\n" +
          "3. You're not using a VPN that blocks location services\n\n" +
          "On mobile: Go to Settings > Location and enable it\n" +
          "On web: Allow location access when prompted by your browser",
          [
            { text: "OK" }
          ]
        );
        setLoadingLocation(false);
        return;
      }

      console.log("Location obtained:", location);
      setUserLocation({ lat: location.lat, lng: location.lng });

      await updateUserLocationRecord(location.lat, location.lng, location.accuracy ?? 0);
      
      console.log("Location tracked successfully");
      
      await fetchCircleMembersAndLocations();
      
      if (isPremium) {
        fetchNearbyServices(location.lat, location.lng);
      }
    } catch (error: any) {
      console.error("Error updating location:", error);
      Alert.alert(
        "Location Error", 
        "Failed to update location. Error: " + (error.message || "Unknown error"),
        [
          { text: "Retry", onPress: () => updateLocation() },
          { text: "Cancel" }
        ]
      );
    } finally {
      setLoadingLocation(false);
    }
  };

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

      const locationsQuery = query(
        collection(db, 'recorded_locations'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const locationsSnapshot = await getDocs(locationsQuery);

      if (!locationsSnapshot.empty) {
        const docRef = locationsSnapshot.docs[0].ref;
        await updateDoc(docRef, locationData);
        console.log("Updated existing location record");
      } else {
        await addDoc(collection(db, 'recorded_locations'), locationData);
        console.log("Created new location record");
      }
    } catch (error) {
      console.error("Error updating location record:", error);
    }
  };

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
      setCircleMembers(members);
      
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

  const fetchNearbyServices = async (lat: number, lng: number) => {
    if (!isPremium) return;
    
    setLoadingServices(true);
    try {
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

  // NEW: Handle messages from WebView (for route info)
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'routeInfo') {
        setRouteDistance(data.distance);
        setRouteDuration(data.duration);
      } else if (data.type === 'routeError') {
        Alert.alert('Routing Error', data.message);
        setShowRoute(false);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const generateMapHTML = (userData?: any) => {
    // Determine map center based on context
    let centerLat: number;
    let centerLon: number;
    
    if (isEmergencyView && focusLat && focusLng) {
      centerLat = focusLat;
      centerLon = focusLng;
    } else if (userLocation) {
      centerLat = userLocation.lat;
      centerLon = userLocation.lng;
    } else {
      centerLat = -15.3875;
      centerLon = 28.3228;
    }
    
    const filteredMembers = selectedCategory 
      ? circleMembers.filter(m => m.category === selectedCategory)
      : circleMembers;
    
    const filteredLocations = memberLocations.filter(loc => 
      filteredMembers.some(m => m.userId === loc.userId)
    );
    
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
      isEmergency?: boolean;
      profilePicture?: string;
    };
    
    const allMarkers: MapMarker[] = [];
    
    // Add emergency location if viewing an SOS alert
    if (isEmergencyView && focusLat && focusLng) {
      allMarkers.push({
        lat: focusLat,
        lng: focusLng,
        name: focusUserName || 'Emergency Alert',
        color: '#dc2626',
        icon: '🚨',
        type: 'emergency',
        isEmergency: true
      });
    }
    
    // Add current user location with profile picture (ALWAYS show in emergency view if available)
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
    
    // Add circle member locations with profile pictures
    allMarkers.push(...filteredLocations.map(location => {
      const member = circleMembers.find(m => m.userId === location.userId);
      return {
        lat: location.latitude,
        lng: location.longitude,
        name: member ? member.name : 'Unknown',
        color: '#2196f3',
        icon: '👤',
        type: 'member',
        category: member?.category || 'Unknown',
        profilePicture: member?.profilePictureBase64
      };
    }));
    
    // Add nearby services for premium users
    if (isPremium) {
      allMarkers.push(...nearbyServices.map(service => ({
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
      })));
    }

    const markersJS = allMarkers.map((marker, index) => `
      L.marker([${marker.lat}, ${marker.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: \`
            <div style="
              position: relative;
              width: ${marker.isEmergency ? '50px' : '45px'};
              height: ${marker.isEmergency ? '60px' : '55px'};
              display: flex;
              flex-direction: column;
              align-items: center;
              ${marker.isEmergency ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
            ">
              <div style="
                background-color: ${marker.color};
                width: ${marker.isEmergency ? '45px' : '40px'};
                height: ${marker.isEmergency ? '45px' : '40px'};
                border-radius: 50%;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 ${marker.isEmergency ? '4px 12px' : '3px 8px'} rgba(0,0,0,${marker.isEmergency ? '0.5' : '0.4'});
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              ">
                ${marker.profilePicture ? 
                  `<img src="${marker.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg);" />` :
                  `<span style="transform: rotate(45deg); font-size: ${marker.isEmergency ? '22px' : '18px'}; line-height: 1;">${marker.icon}</span>`
                }
              </div>
              <div style="
                background: ${marker.isEmergency ? '#dc2626' : 'white'};
                color: ${marker.isEmergency ? 'white' : '#333'};
                padding: 2px 6px;
                border-radius: 4px;
                font-size: ${marker.isEmergency ? '11px' : '10px'};
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
          iconSize: [${marker.isEmergency ? '50' : '45'}, ${marker.isEmergency ? '60' : '55'}],
          iconAnchor: [${marker.isEmergency ? '25' : '22'}, ${marker.isEmergency ? '60' : '55'}]
        })
      }).addTo(map).bindPopup(
        '<div style="min-width: 200px;">' +
          '<h3 style="margin: 0 0 8px 0; font-size: 16px; color: ${marker.isEmergency ? '#dc2626' : '#333'};">${marker.icon} ${marker.name}</h3>' +
          ${marker.isEmergency ? "'<p style=\"margin: 4px 0; font-size: 13px; color: #dc2626; font-weight: bold;\">⚠️ EMERGENCY ALERT</p>'" : "''"} +
          '<p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Type:</strong> ${marker.type}</p>' +
          ${marker.category ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Category:</strong> ${marker.category}</p>'" : "''"} +
          ${marker.phone ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Phone:</strong> ${marker.phone}</p>'" : "''"} +
          ${marker.address ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #666;\"><strong>Address:</strong> ${marker.address}</p>'" : "''"} +
          ${marker.distance ? "'<p style=\"margin: 4px 0; font-size: 12px; color: #2196f3;\"><strong>Distance:</strong> ${marker.distance}m away</p>'" : "''"} +
          '<p style="margin: 4px 0; font-size: 11px; color: #999;">${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}</p>' +
        '</div>'
      )${marker.isEmergency ? '.openPopup()' : ''};
    `).join('\n');

    // NEW: Routing script - Initialize routing variables
    const shouldShowRoute = isEmergencyView && showRoute && userLocation && focusLat && focusLng;
    const routingScript = shouldShowRoute ? `
      // Store route layer globally so we can remove it later
      window.routeLayer = null;
      window.routeMarkers = [];
      
      // Calculate and display route
      console.log('Fetching route from:', [${userLocation.lng}, ${userLocation.lat}], 'to:', [${focusLng}, ${focusLat}]);
      
      fetch('https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${focusLng},${focusLat}?overview=full&geometries=geojson&steps=true&alternatives=false')
        .then(response => {
          console.log('OSRM Response status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('OSRM Response data:', data);
          
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates;
            
            console.log('Route found with', coordinates.length, 'points');
            
            // Convert coordinates to Leaflet format [lat, lng]
            const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
            
            // Remove old route if exists
            if (window.routeLayer) {
              map.removeLayer(window.routeLayer);
            }
            window.routeMarkers.forEach(marker => map.removeLayer(marker));
            window.routeMarkers = [];
            
            // Draw the route with a more visible style
            window.routeLayer = L.polyline(latlngs, {
              color: '#2563eb',
              weight: 6,
              opacity: 0.9,
              lineJoin: 'round',
              lineCap: 'round',
              smoothFactor: 1
            }).addTo(map);
            
            console.log('Route polyline added to map');
            
            // Add direction arrows along the route (every ~10% of the route)
            const arrowInterval = Math.max(1, Math.floor(latlngs.length / 8));
            for (let i = arrowInterval; i < latlngs.length - 1; i += arrowInterval) {
              const current = latlngs[i];
              const next = latlngs[i + 1];
              const bearing = Math.atan2(next[1] - current[1], next[0] - current[0]) * 180 / Math.PI;
              
              const arrowMarker = L.marker(current, {
                icon: L.divIcon({
                  className: 'arrow-icon',
                  html: '<div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 12px solid #2563eb; transform: rotate(' + (bearing + 90) + 'deg);"></div>',
                  iconSize: [16, 12],
                  iconAnchor: [8, 6]
                })
              }).addTo(map);
              
              window.routeMarkers.push(arrowMarker);
            }
            
            // Calculate route statistics
            const distance = (route.distance / 1000).toFixed(2);
            const duration = Math.ceil(route.duration / 60);
            
            console.log('Route statistics:', distance, 'km,', duration, 'minutes');
            
            // Send route info back to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'routeInfo',
                distance: parseFloat(distance),
                duration: duration
              }));
            }
            
            // Add route information popup at the midpoint
            const midpointIndex = Math.floor(latlngs.length / 2);
            const midpoint = latlngs[midpointIndex];
            
            const infoMarker = L.marker(midpoint, {
              icon: L.divIcon({
                className: 'route-info-marker',
                html: \`
                  <div style="
                    background: #2563eb;
                    color: white;
                    padding: 10px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 13px;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                    border: 2px solid white;
                    margin-top: 24px;
                  ">
                    📍 \${distance} km • ~\${duration} min
                  </div>
                \`,
                iconSize: [140, 40],
                iconAnchor: [70, 20]
              })
            }).addTo(map);
            
            window.routeMarkers.push(infoMarker);
            
            // Fit map to show entire route with padding
            const bounds = window.routeLayer.getBounds();
            map.fitBounds(bounds, { 
              padding: [60, 60],
              maxZoom: 15
            });
            
            console.log('Route rendering complete');
          } else {
            console.error('No route found. OSRM response:', data);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'routeError',
                message: 'Could not find a route between the two locations'
              }));
            }
          }
        })
        .catch(error => {
          console.error('Routing error:', error);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeError',
              message: 'Failed to calculate route: ' + error.message
            }));
          }
        });
    ` : '';
    
    // Script to clear route when needed
    const clearRouteScript = !shouldShowRoute && isEmergencyView ? `
      // Clear route if it exists
      if (window.routeLayer) {
        map.removeLayer(window.routeLayer);
        window.routeLayer = null;
      }
      if (window.routeMarkers) {
        window.routeMarkers.forEach(marker => map.removeLayer(marker));
        window.routeMarkers = [];
      }
    ` : '';

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
          .arrow-icon { background: transparent; border: none; }
          .route-info-marker { background: transparent; border: none; }
          .leaflet-popup-content-wrapper {
            border-radius: 8px;
          }
          .leaflet-popup-content {
            margin: 12px;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${centerLat}, ${centerLon}], ${isEmergencyView ? 15 : 13});
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          ${markersJS}

          ${allMarkers.length > 0 && !shouldShowRoute ? `
          var bounds = L.latLngBounds([
            ${allMarkers.map(m => `[${m.lat}, ${m.lng}]`).join(',\n            ')}
          ]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: ${isEmergencyView ? 15 : 15} });
          ` : ''}
          
          ${routingScript}
          ${clearRouteScript}
        </script>
      </body>
      </html>
    `;
  };

  const handleRecordLocation = async () => {
    setIsRecording(true);
    await updateLocation();
    setIsRecording(false);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await updateLocation();
    setRefreshing(false);
  };

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

    const mapHtml = generateMapHTML(userData);
    const mapKey = `${userLocation?.lat}-${userLocation?.lng}-${showRoute}`;

    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapContainer}>
          <iframe
            key={mapKey}
            srcDoc={mapHtml}
            style={styles.mapIframe}
            title="Live Location Map"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
          />
          
          {!isEmergencyView && (
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
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.mapContainer}>
          <WebView
            key={mapKey}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#d32f2f" />
              </View>
            )}
          />
          
          {!isEmergencyView && (
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
          )}
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

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.circlesScrollView}
      >
        {Object.entries(groupedMembers).map(([category, members]) => {
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
                {members.slice(0, 5).map((member) => {
                  const hasLocation = memberLocations.some(loc => loc.userId === member.userId);
                  return (
                    <View key={member.id} style={[
                      styles.avatar,
                      hasLocation && styles.avatarActive
                    ]}>
                      {member.profilePictureBase64 ? (
                        <Image
                          source={{ uri: member.profilePictureBase64 }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                      )}
                    </View>
                  );
                })}
                {members.length > 5 && (
                  <View style={styles.avatarMoreBadge}>
                    <Text style={styles.avatarMoreText}>+{members.length - 5}</Text>
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
        })}
      </ScrollView>
    );
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

  if (!initialized) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Location</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isEmergencyView && styles.emergencyHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={isEmergencyView ? "#fff" : "#333"} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, isEmergencyView && styles.emergencyHeaderTitle]}>
            {isEmergencyView ? '🚨 Emergency Location' : 'Live Location'}
          </Text>
          {isEmergencyView && focusUserName && (
            <Text style={styles.emergencySubtitle}>{focusUserName} needs help!</Text>
          )}
        </View>
        {!isEmergencyView && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} disabled={refreshing}>
            <Ionicons 
              name="refresh" 
              size={24} 
              color={refreshing ? "#ccc" : "#2196f3"} 
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          !isEmergencyView ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#d32f2f']}
              tintColor="#d32f2f"
              title="Pull to refresh location..."
              titleColor="#666"
            />
          ) : undefined
        }
      >
        <View style={styles.mapSection}>
          {renderMapView()}
        </View>

        {isEmergencyView && (
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyBannerContent}>
              <Ionicons name="alert-circle" size={32} color="#dc2626" />
              <View style={styles.emergencyBannerText}>
                <Text style={styles.emergencyBannerTitle}>Emergency Alert Active</Text>
                <Text style={styles.emergencyBannerSubtitle}>
                  {focusUserName || 'A member'} has triggered an SOS alert
                </Text>
              </View>
            </View>
            
            {routeDistance && routeDuration && showRoute && (
              <View style={styles.routeInfoBox}>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="navigate-circle" size={20} color="#2563eb" />
                  <Text style={styles.routeInfoText}>{routeDistance} km</Text>
                </View>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="time" size={20} color="#2563eb" />
                  <Text style={styles.routeInfoText}>~{routeDuration} min</Text>
                </View>
              </View>
            )}
            
            {focusLat && focusLng && userLocation && (
              <View style={styles.emergencyButtonsRow}>
                <TouchableOpacity 
                  style={[styles.emergencyActionButton, styles.routeButton]}
                  onPress={() => setShowRoute(!showRoute)}
                >
                  <Ionicons 
                    name={showRoute ? "close-circle" : "navigate"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.emergencyActionText}>
                    {showRoute ? "Hide Route" : "Show Route"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.emergencyActionButton, styles.externalMapsButton]}
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${focusLat},${focusLng}`;
                    Linking.openURL(url).catch(err => {
                      console.error("Error opening maps:", err);
                      Alert.alert("Error", "Could not open maps");
                    });
                  }}
                >
                  <Ionicons name="map" size={20} color="#fff" />
                  <Text style={styles.emergencyActionText}>External Maps</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!userLocation && (
              <View style={styles.locationWarning}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.locationWarningText}>
                  Enable location to see route
                </Text>
              </View>
            )}
          </View>
        )}

        {!isEmergencyView && (
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
        )}
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
  emergencyHeader: {
    backgroundColor: '#dc2626',
    borderBottomColor: '#b91c1c',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emergencyHeaderTitle: {
    color: '#fff',
    fontSize: 16,
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#fee2e2',
    marginTop: 2,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
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
  emergencyBanner: {
    backgroundColor: '#fee2e2',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  emergencyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 4,
  },
  emergencyBannerSubtitle: {
    fontSize: 13,
    color: '#991b1b',
  },
  routeInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emergencyButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emergencyActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  routeButton: {
    backgroundColor: '#2563eb',
  },
  externalMapsButton: {
    backgroundColor: '#059669',
  },
  emergencyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
    gap: 6,
  },
  locationWarningText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
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
  circlesScrollView: {
    marginBottom: 16,
  },
  circlesSection: {
    marginBottom: 24,
  },
  circleCard: {
    width: 180,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 140,
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
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedText: {
    fontSize: 12,
    color: '#d32f2f',
    marginLeft: 6,
    fontWeight: '500',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  avatarMoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196f3',
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
  circlesHBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  circleCardContainer: {
    flex: 1,
    marginRight: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    maxHeight: 200,
  },
  circleCardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  circleMembersScrollView: {
    flex: 1,
  },
  circleMembersContainer: {
    padding: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  locationIndicator: {
    marginLeft: 8,
  },
});
          
