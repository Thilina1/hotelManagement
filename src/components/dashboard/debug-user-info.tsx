'use client';

import { useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import type { User } from '@/lib/types';


export default function DebugUserInfo() {
    const { user: firebaseUser, isUserLoading } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const firestore = useFirestore();

     useEffect(() => {
        const fetchUserRole = async () => {
            if (firebaseUser) {
                const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        if (!isUserLoading) {
            fetchUserRole();
        }
    }, [firebaseUser, isUserLoading, firestore]);

    return (
        <div className="mt-4 p-4 border bg-secondary/50">
            <h3 className="font-bold">Debug Info: Current User</h3>
            <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify({firebaseUser, user}, null, 2)}
            </pre>
        </div>
    );
}
