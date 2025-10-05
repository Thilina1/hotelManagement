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
  
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollection);

  const isLoading = usersLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your dashboard.</p>
        </div>
      </div>
    </div>
  );
}
