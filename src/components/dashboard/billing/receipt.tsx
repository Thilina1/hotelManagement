
import React from 'react';
import { Bill, OrderItem } from '@/lib/types';
import { format } from 'date-fns';
import { Logo } from '@/components/icons';

interface ReceiptProps {
  bill: Bill;
  items: OrderItem[];
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ bill, items }, ref) => {
  const getPaidAtDate = () => {
    if (!bill.paidAt) return 'N/A';
    
    let date;
    if (typeof bill.paidAt === 'string') {
      date = new Date(bill.paidAt);
    } else if (bill.paidAt.seconds) {
      date = new Date(bill.paidAt.seconds * 1000);
    } else {
      return 'N/A';
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return format(date, 'PPP p');
  };

  return (
    <div ref={ref} className="p-8 font-mono text-sm bg-white text-black">
      <div className="text-center space-y-2 mb-8">
         <div className="flex justify-center items-center gap-2">
            <Logo className="h-8 w-8 text-black" />
            <h1 className="text-2xl font-bold">
                Hotel
            </h1>
         </div>
        <p>123 Ocean View Drive, Paradise City</p>
        <p>Contact: (123) 456-7890</p>
      </div>
      
      <div className="mb-6">
          <p><strong>Bill No:</strong> {bill.billNumber}</p>
          <p><strong>Table No:</strong> {bill.tableNumber}</p>
          <p><strong>Waiter:</strong> {bill.waiterName || 'N/A'}</p>
          <p><strong>Date:</strong> {getPaidAtDate()}</p>
      </div>

      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-dashed border-black">
            <th className="text-left pb-2">Item</th>
            <th className="text-center pb-2">Qty</th>
            <th className="text-right pb-2">Price</th>
            <th className="text-right pb-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="py-1">{item.name}</td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">${item.price.toFixed(2)}</td>
              <td className="text-right py-1">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${bill.subtotal.toFixed(2)}</span>
        </div>
        {bill.discount > 0 && (
            <div className="flex justify-between">
            <span>Discount ({bill.discount}%):</span>
            <span>-${(bill.subtotal * bill.discount / 100).toFixed(2)}</span>
            </div>
        )}
         <div className="flex justify-between font-bold text-lg border-t-2 border-dashed border-black pt-2 mt-2">
          <span>Total:</span>
          <span>${bill.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="mt-4">
        <p><strong>Payment Method:</strong> <span className="capitalize">{bill.paymentMethod}</span></p>
      </div>

      <div className="text-center mt-8">
        <p>Thank you for your visit!</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
