
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Users } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Table, TableSection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const statusStyles: Record<string, { badge: string, border: string }> = {
    'occupied': { badge: 'bg-yellow-500', border: 'border-yellow-500' },
    'available': { badge: 'bg-green-500', border: 'border-green-500' },
    'reserved': { badge: 'bg-purple-500', border: 'border-purple-500' },
};

const tableSections: TableSection[] = ['Sri Lankan', 'Western', 'Outdoor', 'Bar'];

export default function AdminDashboard() {
  const firestore = useFirestore();
  
  const tablesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tables');
  }, [firestore]);

  const { data: tables, isLoading } = useCollection<Table>(tablesCollection);

  const tablesBySection = useMemo(() => {
    if (!tables) return {};
    return tables.reduce((acc, table) => {
      if (!acc[table.section]) {
        acc[table.section] = [];
      }
      acc[table.section].push(table);
      return acc;
    }, {} as Record<TableSection, Table[]>);
  }, [tables]);

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Oversee all restaurant operations and manage tables.</p>
        </div>

        <div className="space-y-8">
          {tableSections.map(section => (
            <div key={section}>
              <h2 className="text-2xl font-bold font-headline mb-4 pb-2 border-b">{section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
                  
                  {!isLoading && tablesBySection[section] && tablesBySection[section].map(table => (
                      <Link key={table.id} href={`/dashboard/tables/${table.id}`} passHref>
                        <Card
                            className={`hover:shadow-lg transition-shadow border-2 h-full flex flex-col justify-between cursor-pointer ${statusStyles[table.status]?.border || 'border-gray-300'}`}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-bold font-headline">Table ${table.tableNumber}</CardTitle>
                                <Badge className={`text-white capitalize ${statusStyles[table.status]?.badge || 'bg-gray-500'}`}>
                                    ${table.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-2 flex-grow">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Users className="w-4 h-4 mr-2" />
                                    <span>${table.capacity} Covers</span>
                                </div>
                            </CardContent>
                             <div className="p-4 pt-0 text-center text-sm text-primary font-semibold">
                                View Details
                            </div>
                        </Card>
                      </Link>
                  ))}
                  
                  {!isLoading && (!tablesBySection[section] || tablesBySection[section].length === 0) && (
                      <div className="col-span-full text-center text-muted-foreground py-10">
                        No tables found in this section.
                      </div>
                  )}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
