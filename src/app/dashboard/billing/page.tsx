
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, CircleSlash, History, Printer, Wallet } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Bill, OrderItem, PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/dashboard/billing/payment-modal';
import { Receipt } from '@/components/dashboard/billing/receipt';
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';


const statusColors: Record<string, string> = {
    'unpaid': 'bg-red-500 text-white',
    'paid': 'bg-green-500 text-white',
};

const paymentMethodIcons: Record<PaymentMethod, React.FC<any>> = {
    cash: Wallet,
    card: CreditCard,
};

export default function BillingPage() {
  const firestore = useFirestore();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [receiptData, setReceiptData] = useState<{ bill: Bill, items: OrderItem[] } | null>(null);

  const receiptRef = useRef(null);

  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'), where('status', '==', 'unpaid'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const paidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'bills'),
        where('status', '==', 'paid')
    );
  }, [firestore]);

  const { data: unpaidBills, isLoading: isLoadingUnpaid } = useCollection<Bill>(unpaidBillsQuery);
  const { data: paidBills, isLoading: isLoadingPaid } = useCollection<Bill>(paidBillsQuery);
  
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    onAfterPrint: () => setReceiptData(null),
  });

  const handleProcessPaymentClick = (bill: Bill) => {
    setSelectedBill(bill);
  };
  
  const handleViewReceiptClick = async (bill: Bill) => {
    if (!firestore) return;
    setReceiptData({ bill, items: bill.items });
    setTimeout(() => handlePrint(), 100);
  };


  const handleCloseModal = () => {
    setSelectedBill(null);
  };
  
  const getFormattedDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    
    let date;
    if (typeof dateValue === 'string') {
        date = new Date(dateValue);
    } else if (dateValue.seconds) { // Firestore Timestamp
        date = new Date(dateValue.seconds * 1000);
    } else {
        return 'Invalid Date';
    }

    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    return format(date, 'Pp');
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Billing</h1>
          <p className="text-muted-foreground">Process payments and view transaction history.</p>
        </div>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
                <CreditCard className="mr-2 h-4 w-4" />
                Pending Bills
            </TabsTrigger>
            <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                Paid History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Bills</CardTitle>
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
                            {isLoadingUnpaid && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingUnpaid && unpaidBills && unpaidBills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                    <TableCell>${bill.total.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge className={`capitalize ${statusColors[bill.status]}`}>
                                            {bill.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {bill.createdAt ? new Date((bill.createdAt as any).seconds * 1000).toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleProcessPaymentClick(bill)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Process Payment
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingUnpaid && (!unpaidBills || unpaidBills.length === 0) && (
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
          </TabsContent>

          <TabsContent value="history">
             <Card>
                <CardHeader>
                    <CardTitle>Paid Bills History</CardTitle>
                    <CardDescription>A record of all completed transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Table No.</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Paid At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPaid && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingPaid && paidBills && paidBills.map(bill => {
                                 const PaymentIcon = bill.paymentMethod ? paymentMethodIcons[bill.paymentMethod] : null;
                                 return (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                        <TableCell>${bill.total.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize flex gap-1 items-center w-fit">
                                                {PaymentIcon && <PaymentIcon className="w-3 h-3"/>}
                                                {bill.paymentMethod || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getFormattedDate(bill.paidAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewReceiptClick(bill)}>
                                                <Printer className="mr-2 h-4 w-4" />
                                                View Receipt
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {!isLoadingPaid && (!paidBills || paidBills.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <CircleSlash className="h-10 w-10" />
                                            <p>No paid bills found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedBill && (
        <PaymentModal
            bill={selectedBill}
            isOpen={!!selectedBill}
            onClose={handleCloseModal}
        />
      )}
       <div className="hidden">
        {receiptData && <Receipt ref={receiptRef} bill={receiptData.bill} items={receiptData.items} />}
      </div>
    </>
  );
}
