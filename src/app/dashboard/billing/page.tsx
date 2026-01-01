
'use client';

import { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, CircleSlash, History, Printer, Wallet, ShoppingCart, Phone } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Bill, PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/dashboard/billing/payment-modal';
import { Receipt } from '@/components/dashboard/billing/receipt';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
    'unpaid': 'bg-red-500 text-white',
    'paid': 'bg-green-500 text-white',
};

const paymentMethodIcons: Record<PaymentMethod, React.FC<any>> = {
    cash: Wallet,
    card: CreditCard,
};

const ITEMS_PER_PAGE = 20;

export default function BillingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [currentPageUnpaid, setCurrentPageUnpaid] = useState(1);
  const [currentPagePaid, setCurrentPagePaid] = useState(1);

  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'bills'), 
        where('status', '==', 'unpaid')
    );
  }, [firestore]);

  const paidBillsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'bills'),
        where('status', '==', 'paid')
    );
  }, [firestore]);

  const { data: unpaidBillsData, isLoading: isLoadingUnpaid } = useCollection<Bill>(unpaidBillsQuery);
  const { data: paidBillsData, isLoading: isLoadingPaid } = useCollection<Bill>(paidBillsQuery);
  
  const sortBills = (bills: Bill[] | null) => {
    if (!bills) return [];
    return [...bills].sort((a, b) => {
      const dateA = a.createdAt ? (a.createdAt as Timestamp).toMillis() : 0;
      const dateB = b.createdAt ? (b.createdAt as Timestamp).toMillis() : 0;
      return dateB - dateA;
    });
  };

  const unpaidBills = useMemo(() => sortBills(unpaidBillsData), [unpaidBillsData]);
  const paidBills = useMemo(() => sortBills(paidBillsData), [paidBillsData]);

  const totalPagesUnpaid = unpaidBills ? Math.ceil(unpaidBills.length / ITEMS_PER_PAGE) : 0;
  const paginatedUnpaidBills = unpaidBills?.slice((currentPageUnpaid - 1) * ITEMS_PER_PAGE, currentPageUnpaid * ITEMS_PER_PAGE);

  const totalPagesPaid = paidBills ? Math.ceil(paidBills.length / ITEMS_PER_PAGE) : 0;
  const paginatedPaidBills = paidBills?.slice((currentPagePaid - 1) * ITEMS_PER_PAGE, currentPagePaid * ITEMS_PER_PAGE);


  const handlePrint = (bill: Bill) => {
    if (!bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
        toast({ title: 'Error', description: 'The bill has no items to display.', variant: 'destructive' });
        return;
    }

    const hasInvalidItems = bill.items.some(item => typeof item.price !== 'number' || typeof item.quantity !== 'number');
    if (hasInvalidItems) {
        toast({ title: 'Error', description: 'The bill contains invalid items and cannot be printed.', variant: 'destructive' });
        return;
    }

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
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-headline font-bold">Restaurant Billing</h1>
                <p className="text-muted-foreground">Create bills, process payments, and view transaction history.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/pos')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>POS</span>
            </Button>
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
                                <TableHead>Table No.</TableHead>
                                <TableHead>Waiter/Staff</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUnpaid && [...Array(ITEMS_PER_PAGE)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingUnpaid && paginatedUnpaidBills && paginatedUnpaidBills.map(bill => (
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
                            {!isLoadingUnpaid && (!paginatedUnpaidBills || paginatedUnpaidBills.length === 0) && (
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
                {totalPagesUnpaid > 1 && (
                  <CardFooter>
                      <Pagination>
                          <PaginationContent>
                              <PaginationItem>
                                  <Button variant="outline" onClick={() => setCurrentPageUnpaid(p => Math.max(1, p - 1))} disabled={currentPageUnpaid === 1}>Previous</Button>
                              </PaginationItem>
                              <PaginationItem>
                                  <span className="p-2 text-sm text-muted-foreground">Page {currentPageUnpaid} of {totalPagesUnpaid}</span>
                              </PaginationItem>
                              <PaginationItem>
                                  <Button variant="outline" onClick={() => setCurrentPageUnpaid(p => Math.min(totalPagesUnpaid, p + 1))} disabled={currentPageUnpaid === totalPagesUnpaid}>Next</Button>
                              </PaginationItem>
                          </PaginationContent>
                      </Pagination>
                  </CardFooter>
                )}
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
                                <TableHead>Table/Customer</TableHead>
                                <TableHead>Waiter/Staff</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Paid At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPaid && [...Array(ITEMS_PER_PAGE)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoadingPaid && paginatedPaidBills && paginatedPaidBills.map(bill => {
                                 const PaymentIcon = bill.paymentMethod ? paymentMethodIcons[bill.paymentMethod] : null;
                                 return (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                                        <TableCell className="font-medium">
                                            <div>{bill.tableNumber === 'walk-in' ? 'Walk-in' : `Table ${bill.tableNumber}`}</div>
                                            {bill.customerMobileNumber && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    {bill.customerMobileNumber}
                                                </div>
                                            )}
                                        </TableCell>
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
                            {!isLoadingPaid && (!paginatedPaidBills || paginatedPaidBills.length === 0) && (
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
                {totalPagesPaid > 1 && (
                    <CardFooter>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <Button variant="outline" onClick={() => setCurrentPagePaid(p => Math.max(1, p - 1))} disabled={currentPagePaid === 1}>Previous</Button>
                                </PaginationItem>
                                <PaginationItem>
                                    <span className="p-2 text-sm text-muted-foreground">Page {currentPagePaid} of {totalPagesPaid}</span>
                                </PaginationItem>
                                <PaginationItem>
                                    <Button variant="outline" onClick={() => setCurrentPagePaid(p => Math.min(totalPagesPaid, p + 1))} disabled={currentPagePaid === totalPagesPaid}>Next</Button>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </CardFooter>
                )}
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
