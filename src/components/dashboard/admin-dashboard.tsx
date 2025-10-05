'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, Users, Utensils, BookCopy, Bed } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Room, Table, User, Booking } from '@/lib/types';
import { Skeleton } from "../ui/skeleton";

export default function AdminDashboard() {
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const roomsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'rooms') : null, [firestore]);
  const tablesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'tables') : null, [firestore]);
  const bookingsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);

  const occupiedRoomsQuery = useMemoFirebase(() => 
    roomsCollection ? query(roomsCollection, where('status', '==', 'occupied'))
    : null
  , [roomsCollection]);
  
  const availableTablesQuery = useMemoFirebase(() =>
    tablesCollection ? query(tablesCollection, where('status', '==', 'available'))
    : null
  , [tablesCollection]);


  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollection);
  const { data: occupiedRooms, isLoading: roomsLoading } = useCollection<Room>(occupiedRoomsQuery);
  const { data: availableTables, isLoading: tablesLoading } = useCollection<Table>(availableTablesQuery);
  const { data: bookings, isLoading: bookingsLoading } = useCollection<Booking>(bookingsCollection);

  const isLoading = usersLoading || roomsLoading || tablesLoading || bookingsLoading;

  const kpiData = [
    { title: "Total Staff", value: users?.length ?? 0, icon: Users },
    { title: "Occupied Rooms", value: occupiedRooms?.length ?? 0, icon: Bed },
    { title: "Available Tables", value: availableTables?.length ?? 0, icon: Utensils },
    { title: "Total Bookings", value: bookings?.length ?? 0, icon: BookCopy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">High-level overview of the restaurant's performance.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
            <Card key={index} className="glassy rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-1/2" />
                ) : (
                    <div className="text-2xl font-bold">{kpi.value}</div>
                )}
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
