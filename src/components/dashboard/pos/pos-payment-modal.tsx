
'use client';

import { useEffect, useState } from 'react';
import { doc, writeBatch, serverTimestamp, getDocs, collection, query, increment } from 'firebase/firestore';
import { useFirestore, useUserContext } from '@/firebase';
import type { Bill, BillItem, PaymentMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Receipt, CreditCard, Wallet } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessfulPayment: () => void;
  billItems: BillItem[];
  subtotal: number;
  tableNumber: string;
}

export function PosPaymentModal({
  isOpen,
  onClose,
  onSuccessfulPayment,
  billItems,
  subtotal,
  tableNumber,
}: PosPaymentModalProps) {
  const firestore = useFirestore();
  const { user: currentUser } = useUserContext();
  const { toast } = useToast();
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  
  const cashReceivedNumber = Number(cashReceived);
  const balance = cashReceivedNumber > 0 ? cashReceivedNumber - total : 0;
  
  const canProcessCashPayment = cashReceivedNumber >= total && !isProcessing;
  const canProcessCardPayment = total >= 0 && !isProcessing;
  const canProcessPayment = paymentMethod === 'cash' ? canProcessCashPayment : canProcessCardPayment;

  const handleProcessPayment = async () => {
    if (!firestore || !currentUser || !canProcessPayment) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Update inventory for inventoried items
      for (const item of billItems) {
        const menuItemRef = doc(firestore, 'menuItems', item.id);
        // This relies on the item having a `stockType` property if it's inventoried.
        // The `BillItem` type may need to be updated to include this. For now, we assume it exists.
        // A safer check would involve fetching the item doc again, but for performance, we assume it's on the item.
        if ((item as any).stockType === 'Inventoried') {
            batch.update(menuItemRef, { stock: increment(-item.quantity) });
        }
      }
      
      // 2. Create the paid bill
      const billsQuery = query(collection(firestore, 'bills'));
      const billsSnapshot = await getDocs(billsQuery);
      const billNumber = `BILL-${(billsSnapshot.size + 1).toString().padStart(4, '0')}`;

      const billRef = doc(collection(firestore, 'bills'));
      const finalBillData: Omit<Bill, 'id'> = {
        billNumber,
        tableNumber,
        waiterName: currentUser.name,
        items: billItems,
        status: 'paid',
        paymentMethod,
        subtotal,
        discount,
        total,
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      };
      batch.set(billRef, finalBillData);
      
      await batch.commit();
      
      toast({
        title: 'Payment Successful',
        description: `Bill for ${tableNumber} has been paid.`,
      });
      onSuccessfulPayment();
    } catch (error) {
      console.error("Error processing POS payment:", error);
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
    if (isOpen) {
        setDiscount(0);
        setCashReceived('');
        setPaymentMethod('cash');
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt />
            Process Payment for {tableNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {billItems.map((item, index) => (
                    <div key={item.id || index} className="flex justify-between items-center text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>LKR {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <Separator />
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="font-medium">Subtotal</span>
                    <span>LKR {subtotal.toFixed(2)}</span>
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
                    <span>-LKR {discountAmount.toFixed(2)}</span>
                </div>
                <Separator />
                 <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>LKR {total.toFixed(2)}</span>
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
                            <span className={balance > 0 ? 'text-green-600 font-bold' : ''}>LKR {balance > 0 ? balance.toFixed(2) : '0.00'}</span>
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
