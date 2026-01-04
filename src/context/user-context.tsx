'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  onAuthStateChanged,
  getAuth,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useFirebaseApp, useFirestore, useDoc } from '@/firebase';
import type { User, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface UserContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
  error: Error | null;
  hasRole: (role: UserRole) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const app = useFirebaseApp();
  const auth = getAuth(app);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setFirebaseUser(user);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const userDocRef = useMemo(() => {
    if (firestore && firebaseUser) {
      return doc(firestore, 'users', firebaseUser.uid);
    }
    return null;
  }, [firestore, firebaseUser]);

  const { data: user, isLoading: isUserDocLoading } = useDoc<User>(userDocRef, {
    listen: true,
  });

  const hasRole = (role: UserRole) => {
    if (!user) return false;
    if (user.role === 'admin') {
      return true;
    }
    return user.role === role;
  };

  const value = {
    user: user || null,
    firebaseUser,
    loading: loading || (!!firebaseUser && isUserDocLoading),
    error,
    hasRole,
  };

  if (value.loading && user === undefined) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-lg font-semibold text-primary animate-pulse">Loading Your Experience...</p>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    );
  }
  
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
