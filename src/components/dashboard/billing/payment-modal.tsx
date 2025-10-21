

'use client';

import { useEffect, useState } from 'react';
import { doc, collection, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Bill, OrderItem, PaymentMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Receipt, CreditCard, Wallet, Printer } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const subtotal = bill.subtotal;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  
  const cashReceivedNumber = Number(cashReceived);
  const balance = cashReceivedNumber > 0 ? cashReceivedNumber - total : 0;
  
  const canProcessCashPayment = cashReceivedNumber >= total && !isProcessing;
  const canProcessCardPayment = total > 0 && !isProcessing;
  const canProcessPayment = paymentMethod === 'cash' ? canProcessCashPayment : canProcessCardPayment;


  const handleProcessPayment = async () => {
    if (!firestore || !canProcessPayment) return;
    setIsProcessing(true);

    const batch = writeBatch(firestore);
    const paidAtTimestamp = serverTimestamp();

    // Update bill
    const billRef = doc(firestore, 'bills', bill.id);
    const finalBillData: Partial<Bill> = {
      discount: discount,
      total: total,
      status: 'paid' as const,
      paidAt: paidAtTimestamp,
      paymentMethod: paymentMethod,
    };
    batch.update(billRef, finalBillData);

    // Update order
    const orderRef = doc(firestore, 'orders', bill.orderId);
    batch.update(orderRef, { status: 'paid', updatedAt: paidAtTimestamp });

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
    setDiscount(bill.discount || 0);
    setCashReceived('');
    setPaymentMethod('cash');
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
                {bill.items && bill.items.map(item => (
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
                
                <RadioGroup defaultValue="cash" onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="flex gap-4 pt-2">
                    <Label htmlFor="cash" className="flex items-center gap-2 p-3 border rounded-md has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:checked]:border-primary flex-1 cursor-pointer">
                        <RadioGroupItem value="cash" id="cash" />
                        <Wallet /> Cash
                    </Label>
                    <Label htmlFor="card" className="flex items-center gap-2 p-3 border rounded-md has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:checked]:border-primary flex-1 cursor-pointer">
                         <RadioGroupItem value="card" id="card" />
                        <CreditCard /> Card
                    </Label>
                </RadioGroup>

                {paymentMethod === 'cash' && (
                    <div className="space-y-3 pt-2">
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
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleProcessPayment} disabled={!canProcessPayment}>
            <CheckCircle className="mr-2 h-4 w-4"/>
            {isProcessing ? 'Processing...' : 'Pay Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
