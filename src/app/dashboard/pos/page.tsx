
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
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
  getDoc,
} from 'firebase/firestore';
import type {
  MenuItem,
  Bill,
  BillItem,
  Table as TableType,
  MenuCategory,
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

const menuCategories: MenuCategory[] = ['Sri Lankan', 'Western', 'Bar'];

export default function POSPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('walk-in');
  const [customerName, setCustomerName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(
    null
  );
  const [selectedVariety, setSelectedVariety] = useState<string | null>(null);
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
      .filter((item) => item.availability)
      .filter((item) =>
        selectedCategory ? item.category === selectedCategory : true
      )
      .filter(item => selectedVariety ? item.varietyOfDishesh === selectedVariety : true)
      .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [menuItems, searchTerm, selectedCategory, selectedVariety, billItems]);

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
    if (menuItem && menuItem.stockType === 'Inventoried' && quantity > (menuItem.stock ?? 0)) {
        toast({
            variant: 'destructive',
            title: 'Not Enough Stock',
            description: `Only ${menuItem.stock} of ${menuItem.name} available.`,
        });
        setBillItems(prevItems => prevItems.map(i => i.id === itemId ? {...i, quantity: menuItem.stock ?? 0} : i));
        return;
    }
    
    setBillItems((prevItems) =>
      prevItems.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  };

  const total = useMemo(() => {
    return billItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [billItems]);

  const handleCreateBill = async () => {
    if (!firestore || billItems.length === 0 || !currentUser) {
      toast({
        title: 'Error',
        description: 'Cannot create an empty bill.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      // 1. Update inventory for inventoried items
      for (const item of billItems) {
        if (!menuItems) continue;
        const originalMenuItem = menuItems.find(mi => mi.id === item.id);
        if (originalMenuItem?.stockType === 'Inventoried') {
           const menuItemRef = doc(firestore, 'menuItems', item.id);
           const newStock = (originalMenuItem.stock ?? 0) - item.quantity;
            if (newStock < 0) {
                throw new Error(`Not enough stock for ${item.name}.`);
            }
           batch.update(menuItemRef, { stock: newStock });
        }
      }

      // 2. Create new bill
      const billsQuery = query(collection(firestore, 'bills'));
      const billsSnapshot = await getDocs(billsQuery);
      const billNumber = `BILL-${(billsSnapshot.size + 1)
        .toString()
        .padStart(4, '0')}`;

      const newBill: Omit<Bill, 'id'> = {
        billNumber,
        tableNumber: selectedTable,
        waiterName: currentUser.name,
        items: billItems,
        subtotal: total,
        discount: 0,
        total,
        status: 'unpaid',
        createdAt: serverTimestamp(),
      };
      
      const billRef = doc(collection(firestore, 'bills'));
      batch.set(billRef, newBill);

      await batch.commit();

      toast({
        title: 'Bill Created',
        description: 'The bill has been sent for payment.',
      });

      // Reset state
      setBillItems([]);
      setSelectedTable('walk-in');
      setCustomerName('');
    } catch (error: any) {
      console.error('Bill creation failed: ', error);
      toast({
        title: 'Bill Creation Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh_-_theme(spacing.24))]">
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
                ) : filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => (
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
          <CardDescription>Review items before creating the bill.</CardDescription>
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
            <div className="w-full flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span>LKR {total.toFixed(2)}</span>
            </div>

            <Button onClick={handleCreateBill} className="w-full" disabled={billItems.length === 0}>
              Create Bill & Send to Payment
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    