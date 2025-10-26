
'use client';

import { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, CircleSlash, History, Printer, Wallet } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, orderBy } from 'firebase/firestore';
import type { Bill, PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/dashboard/billing/payment-modal';
import { Receipt } from '@/components/dashboard/billing/receipt';
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
  
  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'bills'), 
        where('status', '==', 'unpaid'),
        where('bookingId', '==', null),
        orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const paidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'bills'),
        where('status', '==', 'paid'),
        where('bookingId', '==', null),
        orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: unpaidBills, isLoading: isLoadingUnpaid } = useCollection<Bill>(unpaidBillsQuery);
  const { data: paidBills, isLoading: isLoadingPaid } = useCollection<Bill>(paidBillsQuery);
  
  const handlePrint = (bill: Bill) => {
    const receiptElement = <Receipt bill={bill} items={bill.items} />;
    const staticMarkup = renderToStaticMarkup(receiptElement);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: monospace; font-size: 12px; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 4px; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .text-lg { font-size: 1.125rem; }
                        .text-2xl { font-size: 1.5rem; }
                        .mb-8 { margin-bottom: 2rem; }
                        .mb-6 { margin-bottom: 1.5rem; }
                        .mt-8 { margin-top: 2rem; }
                        .mt-4 { margin-top: 1rem; }
                        .space-y-2 > * + * { margin-top: 0.5rem; }
                        .border-dashed { border-style: dashed; }
                        .border-b-2 { border-bottom-width: 2px; }
                        .border-t-2 { border-top-width: 2px; }
                        .border-black { border-color: #000; }
                        .pt-2 { padding-top: 0.5rem; }
                        .capitalize { text-transform: capitalize; }
                        .flex { display: flex; }
                        .justify-center { justify-content: center; }
                        .justify-between { justify-content: space-between; }
                        .items-center { align-items: center; }
                        .gap-2 { gap: 0.5rem; }
                    </style>
                </head>
                <body>
                    ${staticMarkup}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
  };

  const handleProcessPaymentClick = (bill: Bill) => {
    setSelectedBill(bill);
  };
  
  const handleViewReceiptClick = (bill: Bill) => {
    handlePrint(bill);
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
          <h1 className="text-3xl font-headline font-bold">Restaurant Billing</h1>
          <p className="text-muted-foreground">Process payments for restaurant tables and view transaction history.</p>
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
                                <TableHead>Bill No.</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Waiter/Staff</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUnpaid && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingUnpaid && unpaidBills && unpaidBills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                                    <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                    <TableCell>{bill.waiterName || 'N/A'}</TableCell>
                                    <TableCell>LKR {bill.total.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge className={`capitalize ${statusColors[bill.status]}`}>
                                            {bill.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {getFormattedDate(bill.createdAt)}
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
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                                <TableHead>Bill No.</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Waiter/Staff</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Paid At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPaid && [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingPaid && paidBills && paidBills.map(bill => {
                                 const PaymentIcon = bill.paymentMethod ? paymentMethodIcons[bill.paymentMethod] : null;
                                 return (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                                        <TableCell className="font-medium">{bill.tableNumber}</TableCell>
                                        <TableCell>{bill.waiterName || 'N/A'}</TableCell>
                                        <TableCell>LKR {bill.total.toFixed(2)}</TableCell>
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
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
    </>
  );
}
