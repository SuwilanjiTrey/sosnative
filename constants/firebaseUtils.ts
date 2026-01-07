// app/constants/firebase.ts
// Configuration for Firebase Functions

// Replace 'YOUR_PROJECT_ID' with your actual Firebase project ID
// You can find this in your Firebase console or firebase.json
const FIREBASE_PROJECT_ID = 'YOUR_PROJECT_ID'; // e.g., 'safecircle-abc123'

// Firebase Functions URLs
export const FIREBASE_FUNCTIONS_URL = __DEV__
  ? `http://localhost:5001/${FIREBASE_PROJECT_ID}/us-central1`
  : `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// Firebase Functions Endpoints
export const FIREBASE_ENDPOINTS = {
  createPaymentIntent: `${FIREBASE_FUNCTIONS_URL}/createPaymentIntent`,
  // Add more endpoints here as needed
};

// Helper function to call Firebase Functions
export const callFirebaseFunction = async (
  endpoint: string,
  data: any,
  options?: RequestInit
) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Firebase Function Error (${endpoint}):`, error);
    throw error;
  }
};

// Stripe-specific helper
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd'
) => {
  return callFirebaseFunction(FIREBASE_ENDPOINTS.createPaymentIntent, {
    amount,
    currency,
  });
};