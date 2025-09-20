// components/MapComponent.web.tsx
import { View, Text, StyleSheet } from 'react-native';
import { StyledText } from '../../components/StyledText';

export default function MapComponent({ 
  markers = [] 
}: { 
  markers: Array<any>;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StyledText type="title">Live Location Map</StyledText>
        <Text style={styles.subtitle}>
          📱 Map features available in mobile app only
        </Text>
        <Text style={styles.subtext}>
          Download our iOS or Android app for full location tracking.
        </Text>
      </View>
      
      <View style={styles.memberList}>
        {markers.map(marker => (
          <View key={marker.id} style={styles.memberCard}>
            <Text style={styles.memberName}>{marker.title}</Text>
            <Text style={styles.memberRelation}>{marker.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    minHeight: 200,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  subtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  memberList: {
    gap: 15,
    marginTop: 20,
  },
  memberCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRelation: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});