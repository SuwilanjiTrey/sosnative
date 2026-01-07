//profileContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context
interface ProfileContextType {
  profilePicture: string;
  updateProfilePicture: (newPicture: string) => void;
  profileName?: string;
  updateProfileName?: (newName: string) => void;
}

// Create the context with a default value
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Provider component
interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  // Default profile picture (you can change this to any default image)
  const [profilePicture, setProfilePicture] = useState<string>(
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  );
  
  // Optional: Add profile name state
  const [profileName, setProfileName] = useState<string>('John Doe');

  const updateProfilePicture = (newPicture: string) => {
    setProfilePicture(newPicture);
    // Optional: Add persistence logic here (AsyncStorage, API call, etc.)
  };

  const updateProfileName = (newName: string) => {
    setProfileName(newName);
    // Optional: Add persistence logic here
  };

  const value: ProfileContextType = {
    profilePicture,
    updateProfilePicture,
    profileName,
    updateProfileName,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

// Custom hook to use the profile context
export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  
  return context;
};