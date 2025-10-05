"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Clock, Users } from "lucide-react";

const tables = [
    { id: 1, status: 'occupied', covers: 4, time: '45m' },
    { id: 2, status: 'available', covers: 2, time: '0m' },
    { id: 3, status: 'occupied', covers: 6, time: '1h 15m' },
    { id: 4, status: 'needs cleaning', covers: 4, time: '0m' },
    { id: 5, status: 'available', covers: 2, time: '0m' },
    { id: 6, status: 'reserved', covers: 8, time: '0m' },
];

const statusStyles: Record<string, { badge: string, border: string }> = {
    'occupied': { badge: 'bg-blue-500', border: 'border-blue-500' },
    'available': { badge: 'bg-green-500', border: 'border-green-500' },
    'needs cleaning': { badge: 'bg-yellow-500', border: 'border-yellow-500' },
    'reserved': { badge: 'bg-purple-500', border: 'border-purple-500' },
};


export default function WaiterDashboard() {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-headline font-bold">Waiter Dashboard</h1>
            <p className="text-muted-foreground">Oversee tables and manage orders efficiently.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map(table => (
                <Card key={table.id} className={`hover:shadow-lg transition-shadow cursor-pointer border-2 ${statusStyles[table.status]?.border || 'border-gray-300'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-bold font-headline">Table {table.id}</CardTitle>
                        <Badge className={`text-white capitalize ${statusStyles[table.status]?.badge || 'bg-gray-500'}`}>
                            {table.status}
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-2" />
                            <span>{table.covers} Covers</span>
                        </div>
                        {table.status === 'occupied' && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{table.time}</span>
                            </div>
                        )}
                         <div className="flex items-center text-sm text-muted-foreground">
                            <Utensils className="w-4 h-4 mr-2" />
                            <span>View Order</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
