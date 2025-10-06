'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, Firestore, persistentLocalCache } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    
    // It's better to initialize Firestore and then enable persistence.
    const firestore = initializeFirestore(firebaseApp, {
      cache: persistentLocalCache({})
    });

    return getSdks(firebaseApp, firestore);
  }

  // If already initialized, return the SDKs with the already initialized App
  const app = getApp();
  return getSdks(app, getFirestore(app));
}

export function getSdks(firebaseApp: FirebaseApp, firestore: Firestore) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';