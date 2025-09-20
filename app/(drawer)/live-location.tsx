// app/(drawer)/live-location.tsx
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform } from 'react-native';
import MapComponent from '../components/MapComponent'; // ← No extension! Expo auto-resolves
import { useState } from 'react';
import { StyledText } from '../../components/StyledText';

export default function LiveLocationScreen() {
  const [selectedCircle, setSelectedCircle] = useState('Sibling');
  const circles = ['Sibling', 'Friends', 'Emergency Circle'];
  
  // Mock live location data
  const members = [
    {
      id: '1',
      name: 'Boyd Phiri',
      phone: '+260 989 273 728',
      relation: 'Brother',
      location: { latitude: -15.416667, longitude: 28.283333 },
      lastSeen: '2 min ago',
      isLive: true
    },
    {
      id: '2',
      name: 'Beatrice Kay',
      phone: '+260 989 273 729',
      relation: 'Sister',
      location: { latitude: -15.420000, longitude: 28.290000 },
      lastSeen: '5 min ago',
      isLive: true
    },
    {
      id: '3',
      name: 'Samuel Moyo',
      phone: '+260 989 273 730',
      relation: 'Friend',
      location: { latitude: -15.410000, longitude: 28.275000 },
      lastSeen: '10 min ago',
      isLive: false
    }
  ];

  const mapMarkers = members.map(member => ({
    id: member.id,
    coordinate: member.location,
    title: member.name,
    description: member.relation,
  }));

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberPhone}>{item.phone}</Text>
        <Text style={styles.memberRelation}>{item.relation}</Text>
        <Text style={[
          styles.lastSeen,
          { color: item.isLive ? '#4CAF50' : '#FF9800' }
        ]}>
          {item.isLive ? '📍 Live now' : `🕒 Last seen ${item.lastSeen}`}
        </Text>
      </View>
      <TouchableOpacity style={styles.trackButton}>
        <Text style={styles.trackButtonText}>Track</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StyledText type="title" style={{ marginBottom: 20 }}>Live Location</StyledText>
      <Text style={styles.subtitle}>Select your circle to view where they are.</Text>

      {/* Circle Selector */}
      <View style={styles.circleSelector}>
        {circles.map(circle => (
          <TouchableOpacity
            key={circle}
            style={[
              styles.circleButton,
              selectedCircle === circle && styles.circleButtonActive
            ]}
            onPress={() => setSelectedCircle(circle)}
          >
            <Text style={[
              styles.circleButtonText,
              selectedCircle === circle && styles.circleButtonTextActive
            ]}>
              {circle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PLATFORM-AUTOMATIC MAP */}
      <View style={styles.mapContainer}>
        <MapComponent
          initialRegion={{
            latitude: -15.416667,
            longitude: 28.283333,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={mapMarkers}
        />
      </View>

      {/* Member List */}
      <FlatList
        data={members}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.memberList}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
    fontSize: 14,
  },
  circleSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  circleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  circleButtonActive: {
    backgroundColor: '#d32f2f',
  },
  circleButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  circleButtonTextActive: {
    color: '#fff',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  memberList: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberPhone: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 2,
  },
  memberRelation: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 12,
    fontWeight: '500',
  },
  trackButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});