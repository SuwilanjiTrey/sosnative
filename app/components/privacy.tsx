// privacy.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


export default function PrivacyScreen() {
    const router = useRouter();
  
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy and Policy</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. This policy outlines how we collect, 
            use, and protect your personal information.
          </Text>
          
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <Text style={styles.paragraph}>
            We collect location data, emergency recordings, and contact information 
            to provide our safety services.
          </Text>
          
          <Text style={styles.sectionTitle}>Data Usage</Text>
          <Text style={styles.paragraph}>
            Your data is used solely for emergency response and safety features. 
            We never sell your personal information to third parties.
          </Text>
          
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            All data is encrypted and stored securely. We follow industry best 
            practices to protect your information.
          </Text>
          
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
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
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
    },
    placeholder: {
      width: 36,
    },
    content: {
      flex: 1,
    },
    contentPadding: {
      padding: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#333',
      marginTop: 20,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      color: '#666',
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 20,
      marginBottom: 10,
    },
    paragraph: {
      fontSize: 15,
      color: '#666',
      lineHeight: 24,
      marginBottom: 15,
    },
    lastUpdated: {
      fontSize: 13,
      color: '#999',
      fontStyle: 'italic',
      marginTop: 20,
    },
    inviteContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    inviteTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 20,
      marginBottom: 10,
    },
    inviteSubtitle: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 30,
    },
    inviteCode: {
      backgroundColor: '#F1F8F4',
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
      width: '100%',
    },
    inviteCodeLabel: {
      fontSize: 14,
      color: '#666',
      marginBottom: 8,
    },
    inviteCodeValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#4CAF50',
      letterSpacing: 4,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#4CAF50',
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      gap: 10,
      marginBottom: 20,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    inviteNote: {
      fontSize: 13,
      color: '#FFB800',
      textAlign: 'center',
      fontWeight: '600',
    },
  });