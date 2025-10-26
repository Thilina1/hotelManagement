
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, CircleSlash } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/dashboard/billing/payment-modal';

const statusColors: Record<string, string> = {
    'unpaid': 'bg-red-500 text-white',
    'paid': 'bg-green-500 text-white',
};

export default function PaymentDashboard() {
  const firestore = useFirestore();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'), where('status', '==', 'unpaid'));
  }, [firestore]);

  const { data: bills, isLoading } = useCollection<Bill>(unpaidBillsQuery);

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleCloseModal = () => {
    setSelectedBill(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Payment Dashboard</h1>
          <p className="text-muted-foreground">Track and manage all unpaid bills.</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard />
                    Pending Bills
                </CardTitle>
                <CardDescription>A list of all bills that are waiting for payment.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Table No.</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && bills && bills.map(bill => (
                            <TableRow key={bill.id}>
                                <TableCell className="font-medium">${bill.tableNumber}</TableCell>
                                <TableCell>$${bill.total.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge className={`capitalize ${statusColors[bill.status]}`}>
                                        ${bill.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    ${bill.createdAt ? new Date((bill.createdAt as any).seconds * 1000).toLocaleString() : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleViewBill(bill)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Process Payment
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && (!bills || bills.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <CircleSlash className="h-10 w-10" />
                                        <p>No pending bills found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      {selectedBill && (
        <PaymentModal
            bill={selectedBill}
            isOpen={!!selectedBill}
            onClose={handleCloseModal}
        />
      )}
    </>
  );
}
