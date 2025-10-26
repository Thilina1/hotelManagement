
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import type { Booking, MenuItem, OrderItem, MenuCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MinusCircle, ShoppingCart, Search, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUserContext } from '@/context/user-context';
import { Skeleton } from '@/components/ui/skeleton';


interface AddToBillModalProps {
    booking: Booking;
    isOpen: boolean;
    onClose: () => void;
}

const menuCategories: MenuCategory[] = ['Sri Lankan', 'Western', 'Bar'];

export function AddToBillModal({ booking, isOpen, onClose }: AddToBillModalProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useUserContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
    const [localOrder, setLocalOrder] = useState<Record<string, number>>({});
    const fallbackImage = PlaceHolderImages.find(p => p.id === 'login-background');
    
    const menuItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'menuItems') : null, [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsRef);
    
    const filteredMenuItems = useMemo(() => {
        if (!menuItems) return [];
        return menuItems
            .filter(item => item.availability)
            .filter(item => selectedCategory ? item.category === selectedCategory : true)
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [menuItems, searchTerm, selectedCategory]);

    const handleAddItem = (menuItem: MenuItem) => {
        if (menuItem.stockType === 'Inventoried' && (menuItem.stock ?? 0) <= (localOrder[menuItem.id] || 0)) {
             toast({ variant: 'destructive', title: 'Out of Stock', description: `${menuItem.name} is currently unavailable.` });
             return;
        }
        setLocalOrder(prev => ({ ...prev, [menuItem.id]: (prev[menuItem.id] || 0) + 1 }));
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
        if (!firestore || !currentUser || Object.keys(localOrder).length === 0) return;

        const batch = writeBatch(firestore);
        
        try {
            let orderTotalPrice = 0;
            const orderItems: Omit<OrderItem, 'id' | 'orderId'>[] = [];

            for (const menuItemId in localOrder) {
                const quantity = localOrder[menuItemId];
                const menuItem = menuItems?.find(m => m.id === menuItemId);

                if (menuItem) {
                    orderTotalPrice += menuItem.price * quantity;
                    orderItems.push({
                        menuItemId,
                        name: menuItem.name,
                        price: menuItem.price,
                        quantity,
                    });

                    if (menuItem.stockType === 'Inventoried') {
                        const menuItemRef = doc(firestore, 'menuItems', menuItem.id);
                        batch.update(menuItemRef, { stock: increment(-quantity) });
                    }
                }
            }
            
            // Create a new order document in the subcollection
            const newOrderRef = doc(collection(firestore, 'bookings', booking.id, 'orders'));
            batch.set(newOrderRef, {
                bookingId: booking.id,
                waiterId: currentUser.id,
                waiterName: currentUser.name,
                items: orderItems,
                totalPrice: orderTotalPrice,
                createdAt: serverTimestamp(),
            });

            // Update the extra charges on the booking itself
            const bookingRef = doc(firestore, 'bookings', booking.id);
            batch.update(bookingRef, {
                extraCharges: increment(orderTotalPrice),
                updatedAt: serverTimestamp(),
            });

            await batch.commit();

            setLocalOrder({});
            toast({ title: 'Items Added', description: 'New items have been added to the guest\'s bill.' });
            onClose();

        } catch (error) {
            console.error('Error adding items to bill:', error);
            toast({ variant: 'destructive', title: 'Order Failed', description: 'Could not add items to the bill.' });
        }
    };
    
    const totalLocalPrice = Object.entries(localOrder).reduce((acc, [id, quantity]) => {
        const item = menuItems?.find(m => m.id === id);
        return acc + (item ? item.price * quantity : 0);
    }, 0);
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add to Bill for Room {booking.roomNumber}</DialogTitle>
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
                                    ) : filteredMenuItems.map(item => (
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
                                                    <p className="text-sm text-muted-foreground">LKR {item.price.toFixed(2)}</p>
                                                    {item.stockType === 'Inventoried' && <p className={`text-xs ${item.stock && item.stock > 0 ? 'text-primary' : 'text-destructive'}`}>Stock: {item.stock}</p>}
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handleAddItem(item)} disabled={item.stockType === 'Inventoried' && (item.stock ?? 0) <= (localOrder[item.id] || 0)}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                                            </Button>
                                        </div>
                                    ))}
                                    {!areMenuItemsLoading && filteredMenuItems.length === 0 && (
                                        <div className="text-center text-muted-foreground py-10">No menu items found.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="sticky top-0 h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center"><ShoppingCart className="mr-2"/> New Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 overflow-auto">
                            <div className="space-y-1 pr-2 max-h-full overflow-y-auto">
                            {Object.keys(localOrder).length > 0 ? (
                                Object.entries(localOrder).map(([id, quantity]) => {
                                    const item = menuItems?.find(m => m.id === id);
                                    if (!item) return null;
                                    return (
                                        <div key={id} className="flex justify-between items-center text-sm mb-1">
                                            <div><p>{item.name} x {quantity}</p></div>
                                            <div className="flex items-center gap-2">
                                                <p>LKR {(item.price * quantity).toFixed(2)}</p>
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
                            <div className="w-full flex justify-between items-center text-lg font-bold">
                                <span>Total:</span>
                                <span>LKR {totalLocalPrice.toFixed(2)}</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirmOrder} disabled={Object.keys(localOrder).length === 0}>
                        Confirm & Add to Bill
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

