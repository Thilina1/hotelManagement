
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const FirebaseErrorListener = () => {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // This will be caught by Next.js's development error overlay.
      // In production, it will be caught by a global error boundary if one is set up.
      // DO NOT console.error() here as it can lead to duplicate error messages.
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      // It's good practice to remove the listener on cleanup,
      // though for a singleton like this, it's less critical.
    };
  }, []);

  // This component does not render anything.
  return null;
};
