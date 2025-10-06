
'use client';

import { useEffect, useState } from 'react';
import { doc, collection, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Bill, OrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Receipt } from 'lucide-react';

interface PaymentModalProps {
  bill: Bill;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentModal({ bill, isOpen, onClose }: PaymentModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [discount, setDiscount] = useState(bill.discount || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | string>('');


  const orderItemsRef = useMemoFirebase(() => {
    if (!firestore || !bill) return null;
    return collection(firestore, 'orders', bill.orderId, 'items');
  }, [firestore, bill]);

  const { data: orderItems, isLoading: areItemsLoading } = useCollection<OrderItem>(orderItemsRef);

  const subtotal = bill.subtotal;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  
  const cashReceivedNumber = Number(cashReceived);
  const balance = cashReceivedNumber > 0 ? cashReceivedNumber - total : 0;
  const canProcessPayment = cashReceivedNumber >= total && !isProcessing;


  const handleProcessPayment = async () => {
    if (!firestore || !canProcessPayment) return;
    setIsProcessing(true);

    const batch = writeBatch(firestore);

    // Update bill
    const billRef = doc(firestore, 'bills', bill.id);
    batch.update(billRef, {
      discount: discount,
      total: total,
      status: 'paid',
      paidAt: serverTimestamp(),
    });

    // Update order
    const orderRef = doc(firestore, 'orders', bill.orderId);
    batch.update(orderRef, { status: 'paid', updatedAt: serverTimestamp() });

    // Update table
    const tableRef = doc(firestore, 'tables', bill.tableId);
    batch.update(tableRef, { status: 'available' });

    try {
      await batch.commit();
      toast({
        title: 'Payment Successful',
        description: `Bill for Table ${bill.tableNumber} has been paid.`,
      });
      onClose();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: 'There was an error processing the payment.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
   useEffect(() => {
    // When a new bill is selected, reset the states from the new bill's data.
    setDiscount(bill.discount || 0);
    setCashReceived('');
  }, [bill]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt />
            Bill for Table {bill.tableNumber}
          </DialogTitle>
           <DialogDescription>
            Process the payment for this bill. Created at: {bill.createdAt ? new Date((bill.createdAt as any).seconds * 1000).toLocaleTimeString() : 'N/A'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {areItemsLoading && <Skeleton className="h-24 w-full" />}
                {orderItems && orderItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <Separator />
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="font-medium">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input 
                        id="discount"
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-24 h-8"
                        disabled={isProcessing}
                    />
                </div>
                 <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount Amount</span>
                    <span>- ${discountAmount.toFixed(2)}</span>
                </div>
                <Separator />
                 <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <Label htmlFor="cash-received">Cash Received</Label>
                    <Input 
                        id="cash-received"
                        type="number"
                        placeholder='0.00'
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-32 h-9 text-right"
                        disabled={isProcessing}
                    />
                </div>
                 <div className="flex justify-between font-medium text-lg">
                    <span>Balance</span>
                    <span className={balance > 0 ? 'text-green-600 font-bold' : ''}>${balance > 0 ? balance.toFixed(2) : '0.00'}</span>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleProcessPayment} disabled={!canProcessPayment}>
            <CheckCircle className="mr-2 h-4 w-4"/>
            {isProcessing ? 'Processing...' : 'Mark as Paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
