// utils/date.ts
export const parseDate = (date: any): Date | null => {
    if (!date) return null;
  
    if (typeof date === 'string') {
      return new Date(date);
    }
  
    if (typeof date === 'object' && 'seconds' in date) {
      // Firestore Timestamp
      return new Date(date.seconds * 1000);
    }
  
    return null;
  };