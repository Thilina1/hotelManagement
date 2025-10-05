'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';

interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children, user }: { children: ReactNode; user: User | null }) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
