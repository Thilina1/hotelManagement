'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/dashboard/app-sidebar';
import DashboardHeader from '@/components/dashboard/dashboard-header';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useState } from 'react';
import type { User } from '@/lib/types';


export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user: firebaseUser, isUserLoading } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
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
            setLoading(false);
        };

        if (!isUserLoading) {
            fetchUserRole();
        }
    }, [firebaseUser, isUserLoading, firestore]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router, pathname]);

    if (loading || isUserLoading) {
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
    
    if (!user) {
         router.push('/');
         return null;
    }


    return (
        <div className="bg-muted/40 min-h-screen">
            <SidebarProvider>
                <AppSidebar user={user} />
                <SidebarInset>
                    <DashboardHeader user={user} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
