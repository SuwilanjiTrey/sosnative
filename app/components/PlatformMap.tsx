// components/PlatformMap.tsx
import { View, Text, Platform, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';

export default function PlatformMap({ 
  initialRegion, 
  markers = [], 
  onMarkerPress 
}: { 
  initialRegion: any; 
  markers: Array<{ id: string; coordinate: any; title: string; description: string }>;
  onMarkerPress?: (marker: any) => void;
}) {
  // For web, show a message or use Google Maps JavaScript API
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTitle}>Live Location Map</Text>
        <Text style={styles.webText}>
          🌐 Map functionality is only available in the mobile app.
        </Text>
        <Text style={styles.webText}>
          Please download the iOS or Android app for full map features.
        </Text>
        <View style={styles.markerList}>
          {markers.map(marker => (
            <View key={marker.id} style={styles.markerItem}>
              <Text style={styles.markerTitle}>{marker.title}</Text>
              <Text style={styles.markerDescription}>{marker.description}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // For iOS/Android, use react-native-maps
  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      loadingEnabled={true}
      loadingIndicatorColor="#d32f2f"
      loadingBackgroundColor="#fff"
    >
      {markers.map(marker => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          pinColor="#d32f2f"
          onPress={() => onMarkerPress && onMarkerPress(marker)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
  webText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  markerList: {
    width: '100%',
    marginTop: 20,
  },
  markerItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  markerDescription: {
    fontSize: 14,
    color: '#666',
  },
  map: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});