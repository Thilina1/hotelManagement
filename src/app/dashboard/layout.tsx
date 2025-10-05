'use client';

import React, { useEffect, type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

import AppSidebar from '@/components/dashboard/app-sidebar';
import DashboardHeader from '@/components/dashboard/dashboard-header';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user: firebaseUser, isUserLoading: isAuthLoading } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [isRoleLoading, setIsRoleLoading] = useState(true);
    const router = useRouter();
    const firestore = useFirestore();

    useEffect(() => {
        const fetchUserRole = async () => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                    } else {
                        // This can happen if the auth user exists but the firestore doc was deleted.
                        // Log them out.
                        setUser(null);
                        router.push('/');
                    }
                } catch (e) {
                     setUser(null);
                     router.push('/');
                }
            } else {
                setUser(null);
            }
            setIsRoleLoading(false);
        };

        if (!isAuthLoading && firestore) {
            fetchUserRole();
        }
    }, [firebaseUser, isAuthLoading, firestore, router]);

    useEffect(() => {
        // Redirect only when we are done loading auth and have confirmed there's no firebaseUser
        if (!isAuthLoading && !isRoleLoading && !firebaseUser) {
            router.push('/');
        }
    }, [firebaseUser, isAuthLoading, isRoleLoading, router]);

    const isLoading = isAuthLoading || isRoleLoading;

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
    
    // Pass user data to child components
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { user } as { user: User });
        }
        return child;
    });

    return (
        <div className="bg-muted/40 min-h-screen">
            <SidebarProvider>
                <AppSidebar user={user} />
                <SidebarInset>
                    <DashboardHeader user={user} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        <FirebaseErrorListener />
                        {childrenWithProps}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
