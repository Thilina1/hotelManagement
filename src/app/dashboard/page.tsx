'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import WaiterDashboard from '@/components/dashboard/waiter-dashboard';
import PaymentDashboard from '@/components/dashboard/payment-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { user: firebaseUser, isUserLoading } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

     useEffect(() => {
        const fetchUserRole = async () => {
            if (firebaseUser) {
                const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                }
            }
            setLoading(false);
        };

        if (!isUserLoading) {
            fetchUserRole();
        }
    }, [firebaseUser, isUserLoading, firestore]);

    if (loading || isUserLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const renderDashboard = () => {
        switch (user?.role) {
            case 'admin':
                return <AdminDashboard />;
            case 'waiter':
                return <WaiterDashboard />;
            case 'payment':
                return <PaymentDashboard />;
            default:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Invalid Role</h2>
                        <p>Your user role is not configured correctly.</p>
                    </div>
                );
        }
    };

    return renderDashboard();
}
