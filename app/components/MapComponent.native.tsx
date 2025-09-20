// components/MapComponent.native.tsx
import MapView, { Marker } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

export default function MapComponent({ 
  initialRegion, 
  markers = [] 
}: { 
  initialRegion: any; 
  markers: Array<{ id: string; coordinate: any; title: string; description: string }>;
}) {
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
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});