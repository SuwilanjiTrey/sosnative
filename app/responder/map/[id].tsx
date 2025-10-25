// app/responder/map/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { StyledText } from '../../../components/StyledText';
import { Ionicons } from '@expo/vector-icons';

interface SOS {
  id: string;
  madeBy: string;
  location: {
    latitude: number;
    longitude: number;
  };
  information: string;
  contact: string;
  status: 'active' | 'responding' | 'resolved';
  createdAt: Date;
}

export default function ResponderMap() {
  const [sos, setSos] = useState<SOS | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !id) return;

    // Subscribe to SOS updates
    const unsubscribe = onSnapshot(
      doc(db, "Responders", currentUser.uid, "SOS", id as string),
      (doc) => {
        if (doc.exists()) {
          setSos({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          } as SOS);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching SOS data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, id]);

  const handleResolveEmergency = async () => {
    if (!sos) return;
    
    Alert.alert(
      "Resolve Emergency",
      "Are you sure you want to mark this emergency as resolved?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await updateDoc(
                doc(db, "Responders", currentUser!.uid, "SOS", sos.id),
                { status: 'resolved' }
              );
              Alert.alert("Success", "Emergency marked as resolved.");
              router.back();
            } catch (error) {
              console.error("Error resolving emergency:", error);
              Alert.alert("Error", "Failed to resolve emergency. Please try again.");
            } finally {
              setUpdatingStatus(false);
            }
          }
        }
      ]
    );
  };

  const generateMapHTML = () => {
    if (!sos) return '';
    
    const centerLat = sos.location.latitude;
    const centerLon = sos.location.longitude;
    
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
          .info-panel {
            position: absolute;
            top: 10px;
            left: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${centerLat}, ${centerLon}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);
          
          // Create emergency marker
          var emergencyIcon = L.divIcon({
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
                  background-color: #ff5252;
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
                  ">🚨</span>
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
                ">Emergency</div>
              </div>
            \`,
            iconSize: [40, 50],
            iconAnchor: [20, 50]
          });
          
          var marker = L.marker([${centerLat}, ${centerLon}], { icon: emergencyIcon })
            .addTo(map)
            .bindPopup(\`
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px;">🚨 Emergency Location</h3>
                <p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Contact:</strong> ${sos.contact}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Information:</strong> ${sos.information || 'No additional information'}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Status:</strong> ${sos.status}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #666;"><strong>Time:</strong> ${sos.createdAt.toLocaleString()}</p>
                <p style="margin: 4px 0; font-size: 11px; color: #999;">${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}</p>
              </div>
            \`)
            .openPopup();
            
          // Send location back to React Native (for potential future use)
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location',
            latitude: ${centerLat},
            longitude: ${centerLon}
          }));
        </script>
      </body>
      </html>
    `;
  };

  const renderMapView = () => {
    if (loading) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#d32f2f" />
            <Text style={styles.mapLoadingText}>Loading emergency location...</Text>
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
            title="Emergency Location Map"
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading emergency location...</Text>
      </View>
    );
  }

  if (!sos) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>Emergency not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <StyledText type="subtitle" style={styles.headerTitle}>Emergency Location</StyledText>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.mapSection}>
        {renderMapView()}
      </View>
      
      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color="#d32f2f" />
          <Text style={styles.infoTitle}>Emergency Details</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact:</Text>
          <Text style={styles.infoValue}>{sos.contact}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Information:</Text>
          <Text style={styles.infoValue}>
            {sos.information || 'No additional information'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: sos.status === 'active' ? '#ff5252' : 
                            sos.status === 'responding' ? '#ff9800' : '#4caf50' }
          ]}>
            <Text style={styles.statusText}>{sos.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time:</Text>
          <Text style={styles.infoValue}>{sos.createdAt.toLocaleString()}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.resolveButton}
          onPress={handleResolveEmergency}
          disabled={updatingStatus}
        >
          {updatingStatus ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#d32f2f',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  mapSection: {
    flex: 1,
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
  infoPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  backButtonText: {
    padding: 4,
  },
  resolveButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    marginTop: 16,
    marginBottom: 24,
  },
});