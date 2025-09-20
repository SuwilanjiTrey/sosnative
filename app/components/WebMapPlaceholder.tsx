// components/WebMapPlaceholder.tsx
import { View, Text, StyleSheet } from 'react-native';
import { StyledText } from '../../components/StyledText';

export default function WebMapPlaceholder({ 
  members = [] 
}: { 
  members: Array<any>;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StyledText type="title">Live Location</StyledText>
        <Text style={styles.subtitle}>
          📱 Map features available in mobile app only
        </Text>
      </View>
      
      <View style={styles.memberList}>
        {members.map(member => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRelation}>{member.relation}</Text>
              <Text style={[
                styles.status,
                { color: member.isLive ? '#4CAF50' : '#FF9800' }
              ]}>
                {member.isLive ? '🟢 Live Location' : `🕒 Last seen ${member.lastSeen}`}
              </Text>
            </View>
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
    padding: 15,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  memberList: {
    gap: 15,
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
  memberInfo: {
    gap: 5,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRelation: {
    fontSize: 14,
    color: '#666',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
});