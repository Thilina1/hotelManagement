'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import type { Order, OrderItem, MenuItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Component to display a single order and its items
function OrderCard({ 
    order, 
    onFulfill, 
    menuItems, 
    orderItems, 
    areOrderItemsLoading 
}: { 
    order: Order, 
    onFulfill: (orderId: string, items: OrderItem[]) => Promise<void>, 
    menuItems: MenuItem[],
    orderItems: OrderItem[] | undefined | null,
    areOrderItemsLoading: boolean,
}) {
    const { toast } = useToast();

    const handleFulfillClick = async () => {
        if(!orderItems) return;
        await onFulfill(order.id, orderItems);
        toast({ title: 'Order Fulfilled', description: `Order ${order.billNumber} has been marked as fulfilled.` });
    };

    const totalPrice = useMemo(() => {
      if(!orderItems) return 0;
      return orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    }, [orderItems]);

    if (orderItems?.length === 0 && !areOrderItemsLoading) {
        return null; 
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{order.billNumber}</CardTitle>
                        <CardDescription>Waiter: {order.waiterName}</CardDescription>
                    </div>
                    <Badge variant={order.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                        {order.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {areOrderItemsLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                ) : (
                    orderItems && orderItems.length > 0 ? (
                        <ScrollArea className="h-full">
                            <ul className="space-y-2">
                                {orderItems.map(item => (
                                    <li key={item.id} className="flex justify-between items-center">
                                        <span>{item.name} x {item.quantity}</span>
                                        <span>LKR {(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    ) : (
                        <p className="text-sm text-muted-foreground">No items in this order.</p>
                    )
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-auto border-t pt-4">
                 <div className="w-full flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span>LKR {totalPrice.toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={handleFulfillClick} disabled={areOrderItemsLoading || !orderItems || orderItems.length === 0}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Fulfilled
                </Button>
            </CardFooter>
        </Card>
    );
}

// Main component for the active orders page
export default function ActiveOrdersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const ordersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'orders'), where('status', '==', 'open')) : null, 
        [firestore]
    );
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

    const menuItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'menuItems') : null, [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsRef);

    const handleFulfillOrder = async (orderId: string, itemsToFulfill: OrderItem[]) => {
        if (!firestore) return;

        try {
            const batch = writeBatch(firestore);
            
            // This logic assumes we fulfill the entire order at once.
            // For item-by-item fulfillment, we would need a more granular approach.
            const orderRef = doc(firestore, 'orders', orderId);
            batch.update(orderRef, { status: 'fulfilled' });

            // If we were tracking fulfillment per item, we would update item statuses here.

            await batch.commit();
            toast({ title: "Order Fulfilled", description: "The order has been successfully marked as fulfilled." });
        } catch (error) {
            console.error("Error fulfilling order:", error);
            toast({ variant: 'destructive', title: "Fulfillment Failed", description: "Could not update the order status." });
        }
    };

    const sortedOrders = useMemo(() => {
        if (!orders) return [];
        return [...orders].sort((a, b) => (a.createdAt as any) - (b.createdAt as any));
    }, [orders]);

    if (areOrdersLoading || areMenuItemsLoading) {
        return (
            <div className="container mx-auto p-4">
                <div className="mb-6">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }
    
    const openOrders = sortedOrders.filter(o => o.status === 'open');

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Active Orders</h1>
                <p className="text-muted-foreground">Manage and fulfill customer orders as they come in.</p>
            </div>

            {openOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {openOrders.map(order => (
                        <OrderCardWrapper key={order.id} order={order} menuItems={menuItems || []} onFulfill={handleFulfillOrder} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Zap className="mx-auto h-12 w-12 text-muted-foreground"/>
                    <h3 className="mt-2 text-sm font-medium text-foreground">No Active Orders</h3>
                    <p className="mt-1 text-sm text-muted-foreground">New orders will appear here as they are placed.</p>
                </div>
            )}
        </div>
    );
}

function OrderCardWrapper({ order, menuItems, onFulfill }: { order: Order, menuItems: MenuItem[], onFulfill: (orderId: string, items: OrderItem[]) => Promise<void> }) {
    const firestore = useFirestore();
    const orderItemsQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'orders', order.id, 'items') : null, 
        [firestore, order.id]
    );
    const { data: orderItems, isLoading: areOrderItemsLoading } = useCollection<OrderItem>(orderItemsQuery);
    
    return <OrderCard order={order} orderItems={orderItems} areOrderItemsLoading={areOrderItemsLoading} menuItems={menuItems} onFulfill={onFulfill} />;
}