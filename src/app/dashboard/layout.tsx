
'use client';

import React, { useEffect, type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser as useAuthUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

import AppSidebar from '@/components/dashboard/app-sidebar';
import DashboardHeader from '@/components/dashboard/dashboard-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { UserProvider } from '@/context/user-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user: firebaseUser, isUserLoading: isAuthLoading } = useAuthUser();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const firestore = useFirestore();

    useEffect(() => {
        const fetchUser = async () => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                    } else {
                        // If no user doc, maybe they are just an auth user without a firestore entry
                        // For this app, we'll treat them as a base user.
                         setUser({
                            id: firebaseUser.uid,
                            name: firebaseUser.email || 'User',
                            role: 'waiter', // default role
                            birthday: '',
                         });
                    }
                } catch (e) {
                     console.error("Error fetching user data:", e);
                     setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };

        if (!isAuthLoading && firestore) {
            fetchUser();
        }
    }, [firebaseUser, isAuthLoading, firestore]);

    useEffect(() => {
        if (!isLoading && !firebaseUser) {
            router.push('/');
        }
    }, [firebaseUser, isLoading, router]);


    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="space-y-4 w-full max-w-4xl p-4">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-14 w-14" />
                        <div className="space-y-2 flex-1">
                             <Skeleton className="h-6 w-1/4" />
                        </div>
                    </div>
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <UserProvider user={user}>
            <div className="bg-muted/40 min-h-screen">
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                        <DashboardHeader />
                        <main className="flex-1 p-4 sm:p-6 lg:p-8">
                            {children}
                        </main>
                    </SidebarInset>
                </SidebarProvider>
            </div>
        </UserProvider>
    );
}
