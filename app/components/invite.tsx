// invite.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


export function InviteScreen() {
    const router = useRouter();
  
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <View style={styles.inviteContent}>
            <Ionicons name="people-outline" size={100} color="#4CAF50" />
            <Text style={styles.inviteTitle}>Invite Your Friends</Text>
            <Text style={styles.inviteSubtitle}>
              Share the app with friends and family to keep them safe too
            </Text>
            
            <View style={styles.inviteCode}>
              <Text style={styles.inviteCodeLabel}>Your Invite Code</Text>
              <Text style={styles.inviteCodeValue}>SOS2025</Text>
            </View>
            
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share App</Text>
            </TouchableOpacity>
            
            <Text style={styles.inviteNote}>
              Friends who sign up with your code get 1 month free premium!
            </Text>
          </View>
        </View>
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