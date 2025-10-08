// app/live-location.tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyledText } from '../../components/StyledText';
import { auth, db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentLocation } from '../utils/location';

export default function LiveLocationScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for circle members
  const circleMembers = [
    { id: '1', name: 'John', latitude: -15.3875, longitude: 28.3228, avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: '2', name: 'Jane', latitude: -15.3975, longitude: 28.3328, avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: '3', name: 'Doe', latitude: -15.3775, longitude: 28.3128, avatar: 'https://i.pravatar.cc/150?img=3' },
  ];

  // Get user's current location on component mount
  useEffect(() => {
    const fetchInitialLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (location) {
          setUserLocation({ lat: location.lat, lng: location.lng });
        }
      } catch (error) {
        console.error("Error getting initial location:", error);
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchInitialLocation();
  }, []);

  // Generate HTML for the map with markers
  const generateMapHTML = () => {
    const centerLat = userLocation?.lat || -15.3875;
    const centerLon = userLocation?.lng || 28.3228;
    
    // Create markers array including user location
    const allMarkers = [
      ...(userLocation ? [{
        lat: userLocation.lat,
        lng: userLocation.lng,
        name: 'You',
        color: '#d32f2f'
      }] : []),
      ...circleMembers.map(member => ({
        lat: member.latitude,
        lng: member.longitude,
        name: member.name,
        color: '#2196f3'
      }))
    ];

    const markersJS = allMarkers.map((marker, index) => `
      L.marker([${marker.lat}, ${marker.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: ${marker.color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 12px; margin-top: 5px;">${marker.name.charAt(0)}</div></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      }).addTo(map).bindPopup('<b>${marker.name}</b><br>Lat: ${marker.lat.toFixed(6)}<br>Lng: ${marker.lng.toFixed(6)}');
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

          // Fit bounds to show all markers
          var bounds = L.latLngBounds([
            ${allMarkers.map(m => `[${m.lat}, ${m.lng}]`).join(',\n            ')}
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        </script>
      </body>
      </html>
    `;
  };

  const handleRecordLocation = async () => {
    if (!auth.currentUser) {
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

      const locationData = {
        userId: auth.currentUser.uid,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'recorded_locations'), locationData);
      
      Alert.alert(
        "Success",
        `Location recorded successfully!\n\nLat: ${location.lat}\nLng: ${location.lng}`,
        [{ text: "OK", onPress: () => {} }]
      );
    } catch (error) {
      console.error("Error recording location:", error);
      Alert.alert("Error", "Failed to record location. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh location
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation({ lat: location.lat, lng: location.lng });
      }
      
      // Here you can also fetch updated circle member locations from Firebase
      // Example: await fetchCircleMembersLocations();
      
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
          
          {/* Locate Me Button */}
          <TouchableOpacity 
            style={styles.locateMeButton}
            onPress={handleRecordLocation}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.locateMeText}>Locate Me</Text>
          </TouchableOpacity>

          {/* Back Button Overlay */}
          <TouchableOpacity 
            style={styles.backButtonOverlay}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Location</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#2196f3" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d32f2f']} // Android
            tintColor="#d32f2f" // iOS
            title="Pull to refresh location..."
            titleColor="#666"
          />
        }
      >
        {/* Map View - Full width at top */}
        <View style={styles.mapSection}>
          {renderMapView()}
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Select your circle to view where they are
          </Text>

          {/* Circle Cards */}
          <View style={styles.circlesSection}>
            {/* Sibling Circle - Selected */}
            <View style={[styles.circleCard, styles.circleCardSelected]}>
              <View style={styles.circleHeader}>
                <Text style={styles.circleName}>Sibling</Text>
                <Text style={styles.circleMembers}>3 Members</Text>
              </View>
              <View style={styles.avatarsRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>J</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>J</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>D</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.sosIconButton}>
                <Ionicons name="alert" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Friends Circle */}
            <View style={styles.circleCard}>
              <View style={styles.circleHeader}>
                <Text style={styles.circleName}>Friends</Text>
                <Text style={styles.circleMembers}>8 Members</Text>
              </View>
              <View style={styles.avatarsRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>A</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>B</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>C</Text>
                </View>
                <View style={styles.avatarMoreBadge}>
                  <Text style={styles.avatarMoreText}>+5</Text>
                </View>
              </View>
            </View>
          </View>

          {/* SOS Emergency Button */}
          <TouchableOpacity style={styles.sosButton}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.sosButtonText}>SOS Emergency</Text>
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
  },
  locateMeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  contentSection: {
    padding: 20,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
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
  },
  circleHeader: {
    marginBottom: 12,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
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
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
  sosIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d32f2f',
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
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});