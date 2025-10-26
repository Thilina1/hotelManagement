
'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, addDoc, updateDoc, writeBatch, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import type { Table as TableType, MenuItem, Order, OrderItem, Bill } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MinusCircle, ShoppingCart, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';

export default function TableOrderPage() {
    const { tableId } = useParams() as { tableId: string };
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useUserContext();

    // Fetch table details
    const tableRef = useMemoFirebase(() => firestore && tableId ? doc(firestore, 'tables', tableId) : null, [firestore, tableId]);
    const { data: table, isLoading: isTableLoading, error: tableError } = useDoc<TableType>(tableRef);

    // Fetch menu items
    const menuItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'menuItems') : null, [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsRef);

    // Fetch current open order for this table
    const openOrderQuery = useMemoFirebase(() => {
        if (!firestore || !tableId) return null;
        return query(collection(firestore, 'orders'), where('tableId', '==', tableId), where('status', '==', 'open'));
    }, [firestore, tableId]);

    const { data: openOrders, isLoading: areOrdersLoading } = useCollection<Order>(openOrderQuery);
    const openOrder = useMemo(() => (openOrders && openOrders.length > 0) ? openOrders[0] : null, [openOrders]);

    // Fetch items for the open order
    const orderItemsRef = useMemoFirebase(() => {
        if (!firestore || !openOrder) return null;
        return collection(firestore, 'orders', openOrder.id, 'items');
    }, [firestore, openOrder]);

    const { data: orderItems, isLoading: areOrderItemsLoading } = useCollection<OrderItem>(orderItemsRef);

    const [localOrder, setLocalOrder] = useState<Record<string, number>>({});

    const handleAddItem = (menuItem: MenuItem) => {
        if (menuItem.stockType === 'Inventoried' && (menuItem.stock ?? 0) <= 0) {
            toast({ variant: 'destructive', title: 'Out of Stock', description: `${menuItem.name} is currently unavailable.` });
            return;
        }
        setLocalOrder(prev => ({
            ...prev,
            [menuItem.id]: (prev[menuItem.id] || 0) + 1,
        }));
    };

    const handleRemoveItem = (menuItemId: string) => {
        setLocalOrder(prev => {
            const newCount = (prev[menuItemId] || 0) - 1;
            if (newCount <= 0) {
                const { [menuItemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [menuItemId]: newCount };
        });
    };

    const handleAddItemsToBill = async () => {
        if (!firestore || !table || !currentUser || Object.keys(localOrder).length === 0) return;

        const batch = writeBatch(firestore);
        let currentOrder = openOrder;
        let currentOrderId;

        try {
            // If no open order exists, create one
            if (!currentOrder) {
                const newOrderRef = doc(collection(firestore, 'orders'));
                batch.set(newOrderRef, {
                    tableId,
                    status: 'open',
                    totalPrice: 0,
                    waiterId: currentUser.id,
                    waiterName: currentUser.name,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                currentOrderId = newOrderRef.id;
            } else {
                currentOrderId = currentOrder.id;
            }

            if (!currentOrderId) throw new Error("Failed to create or find order.");
            
            let orderTotalPrice = openOrder?.totalPrice || 0;

            for (const menuItemId in localOrder) {
                const quantity = localOrder[menuItemId];
                const menuItem = menuItems?.find(m => m.id === menuItemId);

                if (menuItem) {
                    const orderItemRef = doc(collection(firestore, 'orders', currentOrderId, 'items'));
                    batch.set(orderItemRef, {
                        orderId: currentOrderId,
                        menuItemId,
                        name: menuItem.name,
                        price: menuItem.price,
                        quantity,
                    });

                    orderTotalPrice += menuItem.price * quantity;

                    if (menuItem.stockType === 'Inventoried') {
                        const menuItemRef = doc(firestore, 'menuItems', menuItem.id);
                        batch.update(menuItemRef, { stock: increment(-quantity) });
                    }
                }
            }

            const orderRef = doc(firestore, 'orders', currentOrderId);
            batch.update(orderRef, { 
                totalPrice: orderTotalPrice, 
                updatedAt: serverTimestamp(),
                // Also update waiter info in case a different user adds items
                waiterId: currentUser.id,
                waiterName: currentUser.name,
             });
            
            if (table.status === 'available') {
                const tableDocRef = doc(firestore, 'tables', tableId);
                batch.update(tableDocRef, { status: 'occupied' });
            }

            await batch.commit();

            setLocalOrder({});
            toast({ title: 'Items Added', description: 'New items have been added to the bill.' });

        } catch (error) {
            console.error('Error adding items to order:', error);
            toast({ variant: 'destructive', title: 'Order Failed', description: 'Could not add items to the order.' });
        }
    };
    
    const handleProcessPayment = async () => {
        if (!firestore || !openOrder || !table) {
            toast({ variant: 'destructive', title: 'Cannot Process Payment', description: 'There is no open order for this table.' });
            return;
        }
        
        try {
            const batch = writeBatch(firestore);

            // Fetch all items for the bill.
            const allItemsSnapshot = await getDocs(collection(firestore, 'orders', openOrder.id, 'items'));
            const allOrderItems: OrderItem[] = allItemsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as OrderItem));
            
            // Generate a unique, readable bill number
            const billNumber = `BILL-${Date.now()}`;

            // Create the bill document with all items.
            const billRef = doc(collection(firestore, 'bills'));
            batch.set(billRef, {
                billNumber,
                orderId: openOrder.id,
                tableId: table.id,
                tableNumber: table.tableNumber,
                waiterName: openOrder.waiterName || 'N/A',
                items: allOrderItems,
                status: 'unpaid',
                subtotal: openOrder.totalPrice,
                discount: 0,
                total: openOrder.totalPrice,
                createdAt: serverTimestamp(),
            });

            // Update order status to 'billed'
            const orderRef = doc(firestore, 'orders', openOrder.id);
            batch.update(orderRef, { status: 'billed', updatedAt: serverTimestamp() });
            
            // Table status remains 'occupied' until payment is made
            
            await batch.commit();
            
            toast({ title: 'Bill Sent for Payment', description: `The bill for Table ${table.tableNumber} is now pending payment.`});
        } catch (error) {
            console.error('Error processing payment:', error);
            toast({ variant: 'destructive', title: 'Process Failed', description: 'Could not send the bill for payment.' });
        }
    };

    const isLoading = isTableLoading || areMenuItemsLoading || areOrdersLoading || areOrderItemsLoading;
    const totalLocalPrice = Object.entries(localOrder).reduce((acc, [id, quantity]) => {
        const item = menuItems?.find(m => m.id === id);
        return acc + (item ? item.price * quantity : 0);
    }, 0);

    const totalBill = (openOrder?.totalPrice || 0) + totalLocalPrice;

    if (!isTableLoading && !table) {
        notFound();
    }

    if (isLoading) {
        return (
             <div className="container mx-auto p-4 space-y-6">
                <header>
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </header>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                           <Skeleton className="h-8 w-1/4" />
                           <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-4 pr-4">
                                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        </CardContent>
                    </Card>
                     <Card className="sticky top-24">
                        <CardHeader>
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-6 w-1/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <header>
                <h1 className="text-3xl font-headline font-bold">Table {table?.tableNumber} - Order</h1>
                <p className="text-muted-foreground">Add items to the order and manage the bill.</p>
            </header>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Menu</CardTitle>
                        <CardDescription>Select items to add to the order.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-2 pr-4">
                                {menuItems?.filter(item => item.availability).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">LKR {item.price.toFixed(2)}</p>
                                            {item.stockType === 'Inventoried' && <p className="text-xs text-primary">Stock: {item.stock}</p>}
                                        </div>
                                        <Button size="sm" onClick={() => handleAddItem(item)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle className="flex items-center"><ShoppingCart className="mr-2"/> Current Bill</CardTitle>
                         {table && <Badge className="capitalize w-fit">{table.status}</Badge>}
                         {openOrder?.waiterName && <p className="text-sm text-muted-foreground pt-1">Waiter: {openOrder.waiterName}</p>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Separator />
                        <h3 className="font-semibold">Current Order</h3>
                         <ScrollArea className="h-40">
                             {orderItems && orderItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <p>{item.name} x {item.quantity}</p>
                                    <p>LKR {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                            {!areOrderItemsLoading && (!orderItems || orderItems.length === 0) && <p className="text-sm text-muted-foreground">No items in the current order.</p>}
                         </ScrollArea>
                        
                         <Separator />
                         <h3 className="font-semibold">New Items</h3>
                        {Object.keys(localOrder).length > 0 ? (
                           <ScrollArea className="h-32">
                             {Object.entries(localOrder).map(([id, quantity]) => {
                                const item = menuItems?.find(m => m.id === id);
                                if (!item) return null;
                                return (
                                    <div key={id} className="flex justify-between items-center text-sm">
                                        <div>
                                          <p>{item.name} x {quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p>LKR {(item.price * quantity).toFixed(2)}</p>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddItem(item)}><PlusCircle className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(id)}><MinusCircle className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                           </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">Add items from the menu.</p>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Separator/>
                        <div className="w-full flex justify-between items-center text-xl font-bold">
                            <span>Total Bill:</span>
                            <span>LKR {totalBill.toFixed(2)}</span>
                        </div>
                        <Button className="w-full" onClick={handleAddItemsToBill} disabled={Object.keys(localOrder).length === 0}>Add Items to Bill</Button>
                        <Button className="w-full" variant="secondary" onClick={handleProcessPayment} disabled={!openOrder}>
                           <CheckCircle className="mr-2"/> Process Payment & Close Bill
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

    