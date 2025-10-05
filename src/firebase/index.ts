'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, Firestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    
    // It's better to initialize Firestore and then enable persistence.
    const firestore = getFirestore(firebaseApp);
    enableIndexedDbPersistence(firestore).catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a time.
        console.warn('Firestore persistence failed to enable. (multiple tabs open)');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firestore persistence is not available in this browser.');
      }
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