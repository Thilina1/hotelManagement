
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Booking } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityCard } from '@/components/dashboard/activities/activity-card';
import { CircleSlash } from 'lucide-react';
import { useUserContext } from '@/context/user-context';


export default function ActivitiesPage() {
    const firestore = useFirestore();
    const { user: currentUser } = useUserContext();

    const checkedInBookingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'bookings'), where('status', '==', 'checked-in'));
    }, [firestore]);

    const { data: bookings, isLoading } = useCollection<Booking>(checkedInBookingsQuery);

    if (isLoading || !currentUser) {
        return (
            <div className="space-y-6">
                 <div>
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
                 </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-bold">In-Stay Activities</h1>
                <p className="text-muted-foreground">Manage services for all checked-in guests.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!isLoading && bookings && bookings.map(booking => (
                    <ActivityCard key={booking.id} booking={booking} />
                ))}
            </div>

            {!isLoading && (!bookings || bookings.length === 0) && (
                <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground py-20 bg-card rounded-lg">
                    <CircleSlash className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">No Checked-In Guests</h3>
                    <p>There are currently no guests checked in.</p>
                </div>
            )}
        </div>
    )
}
