// app/(drawer)/dashboard.tsx
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet  } from 'react-native';
import SOSButton from '../components/SOSButton';
import { useAuth } from '../../hooks/useAuth';
import { StyledText } from '../../components/StyledText';

export default function DashboardScreen() {
  const { user } = useAuth();

  const circles = [
    { name: 'Sibling', members: 3, id: '1' },
    { name: 'Friends', members: 8, id: '2' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View>
            <StyledText type="subtitle" style={{ color: '#333' }}>
              {user?.displayName || 'User'}
            </StyledText>
            <Text style={styles.location}>Libala Stage 3, Lusaka</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.premiumBadge}>
          <Text style={styles.premiumText}>Premium Account</Text>
        </TouchableOpacity>
      </View>

      {/* SOS Button */}
      <SOSButton onSOSTriggered={() => {}} />

      {/* Circles Section */}
      <Text style={styles.sectionTitle}>My Circles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.circlesScroll}>
        {circles.map(circle => (
          <TouchableOpacity key={circle.id} style={styles.circleCard}>
            <Text style={styles.circleName}>{circle.name}</Text>
            <Text style={styles.circleMembers}>{circle.members} Members</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.circleCardAdd}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Record Button */}
      <TouchableOpacity style={styles.recordButton}>
        <Text style={styles.recordText}>Record</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  location: {
    color: '#666',
    fontSize: 12,
  },
  premiumBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  premiumText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  circlesScroll: {
    marginBottom: 30,
  },
  circleCard: {
    width: 120,
    height: 120,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    padding: 10,
  },
  circleCardAdd: {
    width: 120,
    height: 120,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  circleMembers: {
    fontSize: 14,
    color: '#666',
  },
  addText: {
    fontSize: 24,
    color: '#2196f3',
  },
  recordButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  recordText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});