'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import type { Table as TableType, MenuItem, Order, OrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MinusCircle, ShoppingCart, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderModalProps {
    table: TableType;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderModal({ table, isOpen, onClose }: OrderModalProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useUserContext();

    // Fetch menu items
    const menuItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'menuItems') : null, [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsRef);

    // Fetch current open order for this table
    const openOrderQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), where('tableId', '==', table.id), where('status', '==', 'open'));
    }, [firestore, table.id]);

    const { data: openOrders, isLoading: areOrdersLoading } = useCollection<Order>(openOrderQuery);
    const openOrder = useMemo(() => (openOrders && openOrders.length > 0) ? openOrders[0] : null, [openOrders]);

    // Fetch items for the open order
    const orderItemsRef = useMemoFirebase(() => {
        if (!firestore || !openOrder?.id) return null; // FIX: Check for openOrder.id
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

    const handleConfirmOrder = async () => {
        if (!firestore || !currentUser) return;

        const batch = writeBatch(firestore);
        let currentOrder = openOrder;

        try {
            // If no open order exists, create one
            if (!currentOrder) {
                const newOrderRef = doc(collection(firestore, 'orders'));
                batch.set(newOrderRef, {
                    tableId: table.id,
                    status: 'open',
                    totalPrice: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: currentUser.id,
                });
                // This is a temporary object to use for the rest of the function
                currentOrder = { id: newOrderRef.id, tableId: table.id, status: 'open', totalPrice: 0, createdAt: new Date().toISOString() };
            }

            if (!currentOrder) throw new Error("Failed to create or find order.");
            
            let orderTotalPrice = openOrder?.totalPrice || 0;

            for (const menuItemId in localOrder) {
                const quantity = localOrder[menuItemId];
                const menuItem = menuItems?.find(m => m.id === menuItemId);

                if (menuItem) {
                    const orderItemRef = doc(collection(firestore, 'orders', currentOrder.id, 'items'));
                    batch.set(orderItemRef, {
                        orderId: currentOrder.id,
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

            const orderRef = doc(firestore, 'orders', currentOrder.id);
            batch.update(orderRef, { totalPrice: orderTotalPrice, updatedAt: serverTimestamp() });
            
            if (table.status === 'available') {
                const tableDocRef = doc(firestore, 'tables', table.id);
                batch.update(tableDocRef, { status: 'occupied' });
            }

            await batch.commit();

            setLocalOrder({});
            toast({ title: 'Order Confirmed', description: 'Items have been added to the order.' });

        } catch (error) {
            console.error('Error confirming order:', error);
            toast({ variant: 'destructive', title: 'Order Failed', description: 'Could not confirm the order.' });
        }
    };
    
    const handleMarkAsPaid = async () => {
        if (!firestore || !openOrder) return;
        
        try {
            const batch = writeBatch(firestore);

            const orderRef = doc(firestore, 'orders', openOrder.id);
            batch.update(orderRef, { status: 'paid', updatedAt: serverTimestamp() });
            
            const tableRef = doc(firestore, 'tables', table.id);
            batch.update(tableRef, { status: 'available' });

            await batch.commit();
            
            toast({ title: 'Payment Successful', description: `The bill for Table ${table.tableNumber} has been settled.`});
            onClose();
        } catch (error) {
            console.error('Error marking as paid:', error);
            toast({ variant: 'destructive', title: 'Payment Failed', description: 'Could not process the payment.' });
        }
    };

    const isLoading = areMenuItemsLoading || areOrdersLoading || areOrderItemsLoading;
    const totalLocalPrice = Object.entries(localOrder).reduce((acc, [id, quantity]) => {
        const item = menuItems?.find(m => m.id === id);
        return acc + (item ? item.price * quantity : 0);
    }, 0);

    const totalBill = (openOrder?.totalPrice || 0) + totalLocalPrice;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Table {table?.tableNumber} - Order</DialogTitle>
                </DialogHeader>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start flex-1 overflow-hidden">
                    <Card className="lg:col-span-2 h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Menu</CardTitle>
                            <CardDescription>Select items to add to the order.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2 pr-4">
                                    {isLoading ? (
                                       [...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                                    ) : menuItems?.filter(item => item.availability).map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                                {item.stockType === 'Inventoried' && <p className={`text-xs ${item.stock && item.stock > 0 ? 'text-primary' : 'text-destructive'}`}>Stock: {item.stock}</p>}
                                            </div>
                                            <Button size="sm" onClick={() => handleAddItem(item)} disabled={item.stockType === 'Inventoried' && (item.stock ?? 0) <= 0}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="sticky top-0 h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center"><ShoppingCart className="mr-2"/> Current Bill</CardTitle>
                            {table && <Badge className="capitalize w-fit">{table.status}</Badge>}
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 overflow-hidden">
                            <ScrollArea className="h-full flex flex-col">
                                <Separator />
                                <h3 className="font-semibold my-2">Current Order</h3>
                                {areOrderItemsLoading ? <Skeleton className="h-16 w-full" /> : 
                                 orderItems && orderItems.length > 0 ? (
                                    orderItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <p>{item.name} x {item.quantity}</p>
                                            <p>${(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items in the current order.</p>
                                )}
                                
                                <Separator className="my-2"/>
                                <h3 className="font-semibold mb-2">New Items</h3>
                                {Object.keys(localOrder).length > 0 ? (
                                    Object.entries(localOrder).map(([id, quantity]) => {
                                        const item = menuItems?.find(m => m.id === id);
                                        if (!item) return null;
                                        return (
                                            <div key={id} className="flex justify-between items-center text-sm mb-1">
                                                <div><p>{item.name} x {quantity}</p></div>
                                                <div className="flex items-center gap-2">
                                                    <p>${(item.price * quantity).toFixed(2)}</p>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddItem(item)}><PlusCircle className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(id)}><MinusCircle className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-muted-foreground">Add items from the menu.</p>
                                )}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 mt-auto border-t pt-4">
                            <div className="w-full flex justify-between items-center text-xl font-bold">
                                <span>Total Bill:</span>
                                <span>${totalBill.toFixed(2)}</span>
                            </div>
                            <Button className="w-full" onClick={handleConfirmOrder} disabled={Object.keys(localOrder).length === 0}>Confirm New Items</Button>
                            <Button className="w-full" variant="secondary" onClick={handleMarkAsPaid} disabled={!openOrder || totalBill === 0}>
                               <CheckCircle className="mr-2"/> Mark as Paid
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
