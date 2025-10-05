'use client';

import { useUser } from '@/firebase';
import type { User } from '@/lib/types';


export default function DebugUserInfo() {
    const { user: firebaseUser, isUserLoading } = useUser();
    
    // This component now gets the user prop from the layout if available,
    // but primarily relies on the useUser hook for the auth state.
    // It's kept for debugging purposes.

    if (isUserLoading) {
        return <p>Loading debug info...</p>
    }

    return (
        <div className="mt-4 p-4 border bg-secondary/50">
            <h3 className="font-bold">Debug Info: Current User</h3>
            <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify({firebaseUser}, null, 2)}
            </pre>
        </div>
    );
}
