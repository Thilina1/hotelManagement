'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import WaiterDashboard from '@/components/dashboard/waiter-dashboard';
import PaymentDashboard from '@/components/dashboard/payment-dashboard';
import AppSidebar from '@/components/dashboard/app-sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="space-y-4 w-1/2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
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
                        <button onClick={logout} className="mt-4 underline">Logout</button>
                    </div>
                );
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar user={user} />
            <SidebarInset>
                <main className="min-h-screen flex-1 p-4 sm:p-6 lg:p-8 bg-background">
                    {renderDashboard()}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
