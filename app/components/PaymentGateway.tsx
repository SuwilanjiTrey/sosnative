import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export default function PaymentGatewayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { planId, amount, planName } = useLocalSearchParams();
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const validateCard = () => {
    const cardDigits = cardNumber.replace(/\s/g, '');
    
    if (cardDigits.length !== 16) {
      Alert.alert('Invalid Card', 'Card number must be 16 digits');
      return false;
    }
    
    if (!expiryMonth || !expiryYear || expiryMonth.length !== 2 || expiryYear.length !== 2) {
      Alert.alert('Invalid Expiry', 'Please enter valid expiry date (MM/YY)');
      return false;
    }
    
    if (cvv.length !== 3) {
      Alert.alert('Invalid CVV', 'CVV must be 3 digits');
      return false;
    }
    
    if (!cardholderName.trim()) {
      Alert.alert('Invalid Name', 'Please enter cardholder name');
      return false;
    }
    
    return true;
  };

  const handlePayment = async () => {
    if (!validateCard()) return;
    
    setIsProcessing(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user document to set isPremium to true
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          isPremium: true,
          premiumPlan: planId,
          premiumStartDate: new Date(),
          lastPaymentAmount: amount,
          lastPaymentDate: new Date()
        });
      }
      
      // Success alert and navigation
      Alert.alert(
        'Payment Successful! 🎉',
        `You are now a premium member!\n\nPlan: ${planName}\nAmount: K${amount}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/(tabs)/profile');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'An error occurred while processing your payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Plan</Text>
          <Text style={styles.summaryValue}>{planName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>K{amount}</Text>
        </View>
      </View>

      {/* Payment Form */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Card Details</Text>
        
        {/* Cardholder Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cardholder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#bbb"
            value={cardholderName}
            onChangeText={setCardholderName}
            editable={!isProcessing}
          />
        </View>

        {/* Card Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Card Number</Text>
          <View style={styles.cardNumberContainer}>
            <MaterialCommunityIcons name="credit-card" size={24} color="#666" />
            <TextInput
              style={styles.cardInput}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#bbb"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
              editable={!isProcessing}
            />
          </View>
        </View>

        {/* Expiry and CVV */}
        <View style={styles.rowContainer}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              placeholderTextColor="#bbb"
              value={
                expiryMonth && expiryYear
                  ? `${expiryMonth}/${expiryYear}`
                  : expiryMonth
              }
              onChangeText={(text) => {
                const formatted = formatExpiry(text);
                const parts = formatted.split('/');
                if (parts[0]) setExpiryMonth(parts[0]);
                if (parts[1]) setExpiryYear(parts[1]);
              }}
              keyboardType="numeric"
              maxLength={5}
              editable={!isProcessing}
            />
          </View>
          
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              placeholderTextColor="#bbb"
              value={cvv}
              onChangeText={(text) => setCvv(text.replace(/\D/g, '').substring(0, 3))}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
              editable={!isProcessing}
            />
          </View>
        </View>

        {/* Test Card Info */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.infoTitle}>Test Card (Simulation)</Text>
            <Text style={styles.infoText}>
              Card: 4111 1111 1111 1111{'\n'}
              Any future date, any 3-digit CVV
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Text style={styles.payButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.payButtonText}>Pay K{amount}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="lock" size={16} color="#666" />
        <Text style={styles.footerText}>Your payment information is secure and encrypted</Text>
      </View>
    </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  cardInput: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    backgroundColor: '#4CAF50',
  },
  payButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});