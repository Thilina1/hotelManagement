"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, Auth, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';

import type { User } from '@/lib/types';
import { useFirebase, useFirestore, useAuth as useFirebaseAuth } from '@/firebase';

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// In a real app, email is derived from the user's name. This is a simplification.
// For example, 'Admin User' becomes 'admin.user@example.com'.
// This is not a robust solution but serves for this mock-style login.
const emailFromName = (name: string) => `${name.toLowerCase().replace(' ', '.')}@example.com`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // These hooks can only be called from a component within FirebaseProvider
  const auth = useFirebaseAuth();
  const firestore = useFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, now fetch their profile from Firestore
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          // No user profile found, something is wrong. Log them out.
          await signOut(auth);
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth, firestore, router]);


  const login = async (name: string, password: string): Promise<boolean> => {
    setLoading(true);
    const email = emailFromName(name);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener will handle setting the user state
      // and redirecting, so we just return true here.
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    // The onAuthStateChanged listener will handle clearing user state.
    router.push('/');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
