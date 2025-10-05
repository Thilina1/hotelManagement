'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * A client component that listens for Firestore permission errors
 * and throws them to be displayed by the Next.js error overlay
 * during development. This component does not render anything.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Throw the error so Next.js can catch it and display the overlay.
      // This is only for development mode. In production, you might
      // want to log this to a service like Sentry.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        console.error(error); // Log to console in production
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything
}
