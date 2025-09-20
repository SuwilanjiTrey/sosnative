// types.ts
export type SOSRecord = {
    id: string;
    createdAt: string | { seconds: number; nanoseconds: number }; // Handle Firestore Timestamp
    location?: { lat: number; lng: number; accuracy?: number };
    status: string;
    acks?: any[];
    local?: boolean;
  };

  // types.ts
// types.ts
export type SOSLocation = {
    lat: number;
    lng: number;
    accuracy?: number | null; // 👈 Allow null
  };
  

  
  export type SOSPayload = {
    id: string;
    userId: string;
    createdAt: string;
    location: SOSLocation;
    status: 'queued' | 'sent';
    retryCount: number;
    lastAttemptAt?: string;
  };

  // types.ts
export type Contact = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    invitedAt?: string;
  };
  
