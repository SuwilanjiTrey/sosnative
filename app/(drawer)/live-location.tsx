// app/(drawer)/live-location.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledText } from '../../components/StyledText';

export default function LiveLocationScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <StyledText type="title" style={styles.title}>
        Live Location
      </StyledText>
      <Text style={styles.subtitle}>
        Select your circle to view where they are.
      </Text>

      {/* Coming Soon Card */}
      <View style={styles.comingSoonCard}>
        <Text style={styles.comingSoonTitle}>📍 Live Map Feature</Text>
        <Text style={styles.comingSoonText}>
          Real-time location tracking is coming soon!
        </Text>
        <Text style={styles.comingSoonText}>
          We're working hard to bring you the best safety experience.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
      </View>

      {/* Circle Quick View (from mockup) */}
      <View style={styles.circlesSection}>
        <Text style={styles.sectionTitle}>Your Circles</Text>
        <View style={styles.circlesRow}>
          <View style={styles.circleCard}>
            <Text style={styles.circleName}>Sibling</Text>
            <Text style={styles.circleMembers}>3 Members</Text>
          </View>
          <View style={styles.circleCard}>
            <Text style={styles.circleName}>Friends</Text>
            <Text style={styles.circleMembers}>8 Members</Text>
          </View>
          <View style={styles.circleCardAdd}>
            <Text style={styles.addText}>+3</Text>
          </View>
        </View>
      </View>

      {/* SOS Button (from mockup) */}
      <TouchableOpacity style={styles.sosButton}>
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.recordButton}>
        <Text style={styles.recordButtonText}>Record</Text>
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
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  comingSoonCard: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  circlesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  circleCard: {
    width: 100,
    height: 100,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  circleCardAdd: {
    width: 100,
    height: 100,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  circleName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  circleMembers: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  addText: {
    fontSize: 20,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  sosButton: {
    backgroundColor: '#d32f2f',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  recordButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});