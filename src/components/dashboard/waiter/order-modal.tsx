'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, writeBatch, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import type { Table as TableType, MenuItem, Order, OrderItem, MenuCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MinusCircle, ShoppingCart, CheckCircle, Search, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


interface OrderModalProps {
    table: TableType;
    isOpen: boolean;
    onClose: () => void;
}

const menuCategories: MenuCategory[] = ['Sri Lankan', 'Western', 'Bar'];

export function OrderModal({ table, isOpen, onClose }: OrderModalProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
    const fallbackImage = PlaceHolderImages.find(p => p.id === 'login-background');
    const [refetchToggle, setRefetchToggle] = useState(false);
    
    const [localMenuItems, setLocalMenuItems] = useState<MenuItem[] | null>(null);

    const refetchOrderData = useCallback(() => {
        setRefetchToggle(prev => !prev);
    }, []);

    const menuItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'menuItems') : null, [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsRef);

    useEffect(() => {
        if (menuItems) {
            setLocalMenuItems(menuItems);
        }
    }, [menuItems]);

    const openOrderQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), where('tableId', '==', table.id), where('status', '==', 'open'));
    }, [firestore, table.id, refetchToggle]);

    const { data: openOrders, isLoading: areOrdersLoading } = useCollection<Order>(openOrderQuery);
    const openOrder = useMemo(() => (openOrders && openOrders.length > 0) ? openOrders[0] : null, [openOrders]);

    const orderItemsRef = useMemoFirebase(() => {
        if (!firestore || !openOrder?.id) return null;
        return collection(firestore, 'orders', openOrder.id, 'items');
    }, [firestore, openOrder?.id]);

    const { data: orderItems, isLoading: areOrderItemsLoading } = useCollection<OrderItem>(orderItemsRef);

    const [localOrder, setLocalOrder] = useState<Record<string, number>>({});
    
    useEffect(() => {
        if (!isOpen) {
            setLocalOrder({});
            setSearchTerm('');
            setSelectedCategory(null);
            setLocalMenuItems(menuItems);
        }
    }, [isOpen, menuItems]);
    
    const filteredMenuItems = useMemo(() => {
        if (!localMenuItems) return [];
        return localMenuItems
            .filter(item => item.availability)
            .filter(item => selectedCategory ? item.category === selectedCategory : true)
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localMenuItems, searchTerm, selectedCategory]);

    const handleAddItem = (menuItem: MenuItem) => {
        if (menuItem.stockType === 'Inventoried') {
            const currentStock = menuItem.stock ?? 0;
            const itemsInCart = localOrder[menuItem.id] || 0;
            if (currentStock - itemsInCart <= 0) {
                 toast({ variant: 'destructive', title: 'Out of Stock', description: `${menuItem.name} is currently unavailable.` });
                 return;
            }
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
        if (!firestore || Object.keys(localOrder).length === 0) return;

        let currentOrder = openOrder;
        const orderExisted = !!currentOrder;

        try {
            if (!currentOrder) {
                const newOrderRef = doc(collection(firestore, 'orders'));
                await writeBatch(firestore).set(newOrderRef, {
                    tableId: table.id,
                    status: 'open',
                    totalPrice: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }).commit();
                currentOrder = { id: newOrderRef.id, tableId: table.id, status: 'open', totalPrice: 0, createdAt: new Date().toISOString() };
            }
            
            if (!currentOrder) {
                throw new Error("Order could not be created or found.");
            }

            const batch = writeBatch(firestore);
            
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

                    const orderRef = doc(firestore, 'orders', currentOrder.id);
                    batch.update(orderRef, { totalPrice: increment(menuItem.price * quantity) });

                    if (menuItem.stockType === 'Inventoried') {
                        const menuItemRef = doc(firestore, 'menuItems', menuItem.id);
                        batch.update(menuItemRef, { stock: increment(-quantity) });
                    }
                }
            }

            const orderRef = doc(firestore, 'orders', currentOrder.id);
            batch.update(orderRef, { updatedAt: serverTimestamp() });
            
            if (table.status === 'available') {
                const tableDocRef = doc(firestore, 'tables', table.id);
                batch.update(tableDocRef, { status: 'occupied' });
            }
            
            const billRef = doc(collection(firestore, 'bills'));
             batch.set(billRef, {
                orderId: currentOrder.id,
                tableId: table.id,
                tableNumber: table.tableNumber,
                createdAt: serverTimestamp(),
            });

            await batch.commit();

            setLocalOrder({});
            toast({ title: 'Order Confirmed', description: 'Items have been added and bill created.' });
            
            if (!orderExisted) {
              refetchOrderData();
            }

        } catch (error: any) {
            console.error("Error confirming order", error);
            const permissionError = new FirestorePermissionError({
              path: 'orders',
              operation: 'write',
              requestResourceData: localOrder,
            });
            errorEmitter.emit('permission-error', permissionError);
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
        } catch (error: any) {
            console.error("Error marking as paid", error);
            const permissionError = new FirestorePermissionError({ path: `orders/${openOrder.id}`, operation: 'update' });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Payment Failed', description: 'Could not process the payment.' });
        }
    };

    const isLoading = areMenuItemsLoading || areOrdersLoading;
    
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
                            <div className="flex gap-2 items-center flex-wrap">
                                <div className="relative flex-grow min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search menu..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-full"
                                    />
                                </div>
                                <Button variant={!selectedCategory ? 'default' : 'outline'} onClick={() => setSelectedCategory(null)} size="sm">All</Button>
                                {menuCategories.map(cat => (
                                    <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} onClick={() => setSelectedCategory(cat)} size="sm">{cat}</Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2 pr-4">
                                    {areMenuItemsLoading ? (
                                       [...Array(10)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                                    ) : filteredMenuItems.map(item => {
                                        const itemsInCart = localOrder[item.id] || 0;
                                        const availableStock = (item.stock ?? 0);
                                        const displayStock = availableStock - itemsInCart;
                                        const isOutOfStock = item.stockType === 'Inventoried' && displayStock <= 0;

                                        return (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                                        {fallbackImage ? (
                                                            <Image src={fallbackImage.imageUrl} alt={item.name} layout="fill" className="object-cover" />
                                                        ) : (
                                                            <Utensils className="h-8 w-8 text-muted-foreground"/>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{item.name}</p>
                                                        <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                                        {item.stockType === 'Inventoried' && <p className={`text-xs ${!isOutOfStock ? 'text-primary' : 'text-destructive'}`}>Stock: {displayStock}</p>}
                                                    </div>
                                                </div>
                                                <Button size="sm" onClick={() => handleAddItem(item)} disabled={isOutOfStock}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </div>
                                        );
                                    })}
                                    {!areMenuItemsLoading && filteredMenuItems.length === 0 && (
                                        <div className="text-center text-muted-foreground py-10">
                                            No menu items found.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="sticky top-0 h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center"><ShoppingCart className="mr-2"/> Current Bill</CardTitle>
                            {table && <Badge className="capitalize w-fit">{table.status}</Badge>}
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 overflow-auto">
                           
                                <Separator />
                                <h3 className="font-semibold my-2">Current Order</h3>
                                <div className="space-y-1 pr-2 max-h-32 overflow-y-auto">
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
                                </div>
                                
                                <Separator className="my-2"/>
                                <h3 className="font-semibold mb-2">New Items</h3>
                                <div className="space-y-1 pr-2 max-h-48 overflow-y-auto">
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
                                </div>
                          
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
