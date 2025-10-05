"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

// This is mock data. In a real application, you would fetch this from your database.
// The password field is included for mock authentication purposes and should NOT be stored in plaintext in a real database.
const mockUsers = [
  { id: '1', name: 'Admin User', password: 'admin', role: 'admin', birthday: '1990-01-01' },
  { id: '2', name: 'Waiter User', password: 'waiter', role: 'waiter', birthday: '1995-05-10' },
  { id: '3', name: 'Payment User', password: 'payment', role: 'payment', birthday: '1998-11-20' },
];

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This is a mock session check. In a real app, you'd verify a token or session cookie.
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Could not parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (name: string, password: string): Promise<boolean> => {
    // MOCK AUTHENTICATION
    // In a real application, you would replace this with a call to your authentication service (e.g., Firebase Authentication).
    // Example with Firebase:
    // try {
    //   const userCredential = await signInWithEmailAndPassword(auth, email, password);
    //   // After successful login, fetch user role and other data from Firestore
    //   const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    //   if (userDoc.exists()) {
    //     const userData = { id: userCredential.user.uid, ...userDoc.data() } as User;
    //     setUser(userData);
    //     localStorage.setItem('user', JSON.stringify(userData));
    //     return true;
    //   } else {
    //     await signOut(auth); // Sign out if no user data found
    //     return false;
    //   }
    // } catch (error) {
    //   console.error("Login failed:", error);
    //   return false;
    // }

    const foundUser = mockUsers.find(u => u.name.toLowerCase() === name.toLowerCase() && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userToSet } = foundUser;
      setUser(userToSet);
      localStorage.setItem('user', JSON.stringify(userToSet));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    // In a real app with Firebase: await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
    router.push('/');
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
