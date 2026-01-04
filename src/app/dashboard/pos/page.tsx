
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  increment,
  where,
} from 'firebase/firestore';
import type {
  MenuItem,
  Bill,
  BillItem,
  Table as TableType,
  MenuCategory,
  PaymentMethod,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusCircle,
  Search,
  ShoppingCart,
  Trash2,
  Utensils,
  CheckCircle,
  Wallet,
  CreditCard,
  ArrowLeft,
  Phone,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserContext } from '@/context/user-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const menuCategories: MenuCategory[] = ['Sri Lankan', 'Western', 'Bar'];

export default function POSPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  const router = useRouter();
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('walk-in');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(
    null
  );
  const [selectedVariety, setSelectedVariety] = useState<string | null>(null);

  // Payment state
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerMobile, setCustomerMobile] = useState('');


  const fallbackImage = PlaceHolderImages.find(
    (p) => p.id === 'login-background'
  );

  const menuItemsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'menuItems') : null),
    [firestore]
  );
  const tablesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tables') : null),
    [firestore]
  );
  const varietyOfDishesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'varietyOfDishesh') : null),
    [firestore]
  );

  const { data: menuItems, isLoading: isLoadingMenu } =
    useCollection<MenuItem>(menuItemsCollection);
  const { data: tables, isLoading: isLoadingTables } =
    useCollection<TableType>(tablesCollection);
  const { data: varietyOfDishes, isLoading: isLoadingVarieties } = useCollection<{id: string, name: string}>(varietyOfDishesCollection);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    return menuItems
      .filter((item) => item.availability && item.sellType !== 'Indirect')
      .filter((item) =>
        selectedCategory ? item.category === selectedCategory : true
      )
      .filter(item => selectedVariety ? item.varietyOfDishesh === selectedVariety : true)
      .map(item => {
        if (item.stockType === 'Inventoried') {
            const quantityInCart = billItems.find(cartItem => cartItem.id === item.id)?.quantity || 0;
            const effectiveStock = (item.stock ?? 0) - quantityInCart;
            return {
                ...item,
                stock: effectiveStock < 0 ? 0 : effectiveStock,
            };
        }
        return item;
      });
  }, [menuItems, selectedCategory, selectedVariety, billItems]);

  const addToBill = (item: MenuItem) => {
    const itemInBill = billItems.find(i => i.id === item.id);
    const quantityInBill = itemInBill?.quantity || 0;

    if (item.stockType === 'Inventoried' && (item.stock ?? 0) <= quantityInBill) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${item.name} is currently unavailable.`,
      });
      return;
    }
    setBillItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromBill = (itemId: string) => {
    setBillItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromBill(itemId);
      return;
    }
    const menuItem = menuItems?.find(mi => mi.id === itemId);
    const originalStock = menuItem?.stock ?? 0;
    const currentItemsInCart = billItems.find(i => i.id === itemId)?.quantity || 0;
    const stockWithoutCart = originalStock + currentItemsInCart;

    if (menuItem && menuItem.stockType === 'Inventoried' && quantity > stockWithoutCart) {
        toast({
            variant: 'destructive',
            title: 'Not Enough Stock',
            description: `Only ${stockWithoutCart} of ${menuItem.name} available.`,
        });
        setBillItems(prevItems => prevItems.map(i => i.id === itemId ? {...i, quantity: stockWithoutCart} : i));
        return;
    }
    
    setBillItems((prevItems) =>
      prevItems.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  };
  
  const searchedItems = useMemo(() => {
    if(!filteredMenuItems) return [];
    return filteredMenuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [filteredMenuItems, searchTerm]);

  const subtotal = useMemo(() => {
    return billItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [billItems]);

  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const cashReceivedNumber = Number(cashReceived);
  const balance = cashReceivedNumber > 0 ? cashReceivedNumber - total : 0;
  const canProcessCashPayment = cashReceivedNumber >= total && !isProcessing;
  const canProcessCardPayment = total >= 0 && !isProcessing;
  const canProcessPayment = paymentMethod === 'cash' ? canProcessCashPayment : canProcessCardPayment;

  const resetPOS = () => {
    setBillItems([]);
    setSelectedTable('walk-in');
    setDiscount(0);
    setCashReceived('');
    setPaymentMethod('cash');
    setCustomerMobile('');
  }

  const handleFinalizeAndPay = async () => {
    if (billItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Cannot process an empty bill.',
        variant: 'destructive',
      });
      return;
    }
    if (!firestore || !currentUser || !canProcessPayment) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(firestore);

      // Decrement stock for inventoried items
      for (const item of billItems) {
        const menuItem = menuItems?.find(mi => mi.id === item.id);
        if (menuItem?.stockType === 'Inventoried') {
            const menuItemRef = doc(firestore, 'menuItems', item.id);
            batch.update(menuItemRef, { stock: increment(-item.quantity) });
        }
      }
      
      // Create bill
      const billsQuery = query(collection(firestore, 'bills'));
      const billsSnapshot = await getDocs(billsQuery);
      const billNumber = `BILL-${(billsSnapshot.size + 1).toString().padStart(4, '0')}`;

      const billRef = doc(collection(firestore, 'bills'));
      const finalBillData: Omit<Bill, 'id'> = {
        billNumber,
        tableNumber: selectedTable,
        waiterName: currentUser.name,
        items: billItems,
        status: 'paid',
        paymentMethod,
        subtotal,
        discount,
        total,
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        customerMobileNumber: customerMobile,
      };
      batch.set(billRef, finalBillData);
      
       // Update Loyalty Points if mobile number is provided
      if (customerMobile) {
        const loyaltyQuery = query(collection(firestore, 'loyaltyCustomers'), where('mobileNumber', '==', customerMobile));
        const loyaltySnapshot = await getDocs(loyaltyQuery);
        if (!loyaltySnapshot.empty) {
          const customerDoc = loyaltySnapshot.docs[0];
          const pointsToAdd = Math.floor(total / 1000);
          if (pointsToAdd > 0) {
            batch.update(customerDoc.ref, { totalLoyaltyPoints: increment(pointsToAdd) });
          }
        }
      }

      await batch.commit();
      
      toast({
        title: 'Payment Successful',
        description: `Bill for ${selectedTable} has been paid.`,
      });
      resetPOS();
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
  

  return (
    <>
    <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-headline font-bold">Point of Sale (POS)</h1>
            <p className="text-muted-foreground">Create and process bills for walk-in customers.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh_-_theme(spacing.24)_-_theme(spacing.24))]">
      <Card className="lg:col-span-2 h-full flex flex-col">
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>Click on an item to add it to the bill.</CardDescription>
          <div className="flex gap-2 items-center flex-wrap mt-3">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{selectedCategory || 'All Categories'}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSelectedCategory(null)}>All Categories</DropdownMenuItem>
                {menuCategories.map((cat) => (
                  <DropdownMenuItem key={cat} onSelect={() => setSelectedCategory(cat)}>{cat}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isLoadingVarieties}>{selectedVariety || 'All Varieties'}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedVariety(null)}>All Varieties</DropdownMenuItem>
                    {varietyOfDishes?.map((variety) => (
                      <DropdownMenuItem key={variety.id} onSelect={() => setSelectedVariety(variety.name)}>{variety.name}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
                {isLoadingMenu ? (
                   [...Array(10)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : searchedItems.length > 0 ? (
                    searchedItems.map((item) => (
                         <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                {fallbackImage ? (
                                    <Image src={fallbackImage.imageUrl} alt={item.name} fill className="object-cover" />
                                ) : (
                                    <Utensils className="h-8 w-8 text-muted-foreground" />
                                )}
                                </div>
                                <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">LKR {item.price.toFixed(2)}</p>
                                {item.stockType === 'Inventoried' && (
                                    <p className={`text-xs ${(item.stock ?? 0) > 0 ? 'text-primary' : 'text-destructive'}`}>Stock: {item.stock}</p>
                                )}
                                </div>
                            </div>
                            <Button size="sm" onClick={() => addToBill(item)} disabled={item.stockType === 'Inventoried' && (item.stock ?? 0) <= 0}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                    ))
                ) : (
                     <div className="text-center text-muted-foreground py-10">No menu items found.</div>
                )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart /> Current Bill</CardTitle>
          <CardDescription>Review items before finalizing payment.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                    <Select onValueChange={setSelectedTable} value={selectedTable}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Table" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="walk-in">Walk-in</SelectItem>
                            {isLoadingTables ? <p className="p-2 text-sm">Loading tables...</p> : tables?.map(table => (
                                <SelectItem key={table.id} value={table.tableNumber.toString()}>{`Table ${table.tableNumber}`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                                No items added yet.
                            </TableCell>
                        </TableRow>
                    )}
                    {billItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.id, parseInt(e.target.value))}
                            className="w-16 h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">{(item.price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromBill(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-4">
            <div className="w-full space-y-3">
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

                <Separator />

                 <div className="space-y-2">
                    <Label htmlFor="customer-mobile">Customer Mobile Number (for Loyalty)</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="customer-mobile"
                            placeholder="e.g., 0771234567"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            className="pl-10"
                            disabled={isProcessing}
                        />
                    </div>
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

            <Button onClick={handleFinalizeAndPay} className="w-full mt-4" disabled={billItems.length === 0 || !canProcessPayment}>
              <CheckCircle className="mr-2 h-4 w-4"/>
              {isProcessing ? 'Processing...' : 'Pay Bill'}
            </Button>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
