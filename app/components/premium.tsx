// app/components/premium.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { StyledText } from '../../components/StyledText';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore';
import React from 'react';

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchUserData = async () => {
        if (!user) return;
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchUserData();
    }, [user]);

    //console.log("heres the users information: ", userData);

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 'K50',
      amountUsd: 'K0.5',
      period: '/month',
      features: [
        'Live Location Tracking',
        'rapid response from law enforcement',
        'Priority SOS Response',
        'Unlimited Circle Members',
        '24/7 Support',
        'Ad-free Experience'
      ],
      isPopular: true
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: 'K500',
      amountUsd: 'K0.5',
      period: '/year',
      features: [
        'All Monthly Features',
        '2 Months FREE',
        'Family Discount (up to 5 members)',
        'Emergency Medical Support',
        'Personal Safety Advisor'
      ],
      isPopular: false
    }
  ];

  const handleSubscribe = (planId: string) => {
    const planData = plans.find(p => p.id === planId);
    router.push({
      pathname: './PaymentGateway',
      params: {
    
        planId: planId,
        amount: planData?.amountUsd.replace('K', ''),
        planName: planData?.name
      }
    });
  };

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <StyledText type="title" style={{ marginBottom: 10 }}>Premium Subscription</StyledText>
      <Text style={styles.subtitle}>Become a member for extra security</Text>

      {/* Hero Image/Banner */}
      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/safe.png')}
          style={styles.heroImage}
        />
        <Text style={styles.heroText}>
          Get premium features for enhanced safety and peace of mind
        </Text>
      </View>

      {/* Plans */}
      <View style={styles.plansContainer}>
        {plans.map(plan => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.isPopular && styles.popularPlan
            ]}
          >
            {plan.isPopular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
            )}
            
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{plan.price}</Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>
            
            <View style={styles.features}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.feature}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                plan.isPopular && styles.subscribeButtonPopular
              ]}
              onPress={() => handleSubscribe(plan.id)}
            >
              <Text style={styles.subscribeButtonText}>
                {plan.isPopular ? 'SUBSCRIBE NOW' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        * Prices in Zambian Kwacha (ZMW). Auto-renews until canceled.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Extra padding at the bottom for better scrolling experience
  },
  subtitle: {
    color: '#666',
    marginBottom: 30,
    fontSize: 16,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
    //padding: 20,
    //backgroundColor: '#ffebee',
    borderRadius: 12,
  },
  heroImage: {
    width: '100%',
    height: 82,
    borderRadius: 3,
    marginBottom: 15,
  },
  heroText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    padding: 25,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    position: 'relative',
  },
  popularPlan: {
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    borderColor: '#ffc107',
    transform: [{ scale: 1.05 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  features: {
    marginBottom: 25,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 16,
    marginRight: 10,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonPopular: {
    backgroundColor: '#d32f2f',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  terms: {
    marginTop: 30,
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
});