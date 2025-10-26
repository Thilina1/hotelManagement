
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BedDouble, Calendar, User, Utensils, ClipboardList, Wallet, LogOut } from 'lucide-react';
import type { Booking, PackageActivity } from '@/lib/types';
import { format, eachDayOfInterval, differenceInCalendarDays } from 'date-fns';
import { doc, updateDoc, writeBatch, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AddToBillModal } from './add-to-bill-modal';

const packageActivityLabels: Record<keyof PackageActivity, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    tea: 'Tea',
    activity1: 'Activity 1',
    activity2: 'Activity 2',
};

interface ActivityCardProps {
    booking: Booking;
}

export function ActivityCard({ booking }: ActivityCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddToBillModalOpen, setIsAddToBillModalOpen] = useState(false);
    const [localAdults, setLocalAdults] = useState(booking.adults);
    const [localChildren, setLocalChildren] = useState(booking.children);

    const checkInDate = useMemo(() => booking.checkInDate ? new Date((booking.checkInDate as any).seconds * 1000) : new Date(), [booking.checkInDate]);
    const checkOutDate = useMemo(() => booking.checkOutDate ? new Date((booking.checkOutDate as any).seconds * 1000) : new Date(), [booking.checkOutDate]);

    const stayDays = useMemo(() => {
        if (!checkInDate || !checkOutDate) return [];
        return eachDayOfInterval({ start: checkInDate, end: checkOutDate }).slice(0, -1);
    }, [checkInDate, checkOutDate]);
    
    const handlePackageActivityChange = async (date: Date, activity: keyof PackageActivity, checked: boolean) => {
        if (!firestore) return;
        const dateString = format(date, 'yyyy-MM-dd');
        const bookingRef = doc(firestore, 'bookings', booking.id);
        
        const newPackageActivities = { ...booking.packageActivities };
        if (!newPackageActivities[dateString]) {
            newPackageActivities[dateString] = { breakfast: false, lunch: false, dinner: false, tea: false, activity1: false, activity2: false };
        }
        newPackageActivities[dateString][activity] = checked;

        try {
            await updateDoc(bookingRef, { packageActivities: newPackageActivities });
        } catch (error) {
            console.error('Failed to update package activity:', error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not save the activity change.',
            });
        }
    };
    
    const handlePersonCountChange = async () => {
        if (!firestore) return;
        if(localAdults === booking.adults && localChildren === booking.children) return;

        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            await updateDoc(bookingRef, {
                adults: localAdults,
                children: localChildren,
                updatedAt: serverTimestamp(),
            });
             toast({
                title: 'Guest Count Updated',
                description: `Guest count for ${booking.guestName} has been updated.`,
            });
        } catch (error) {
             console.error('Failed to update person count:', error);
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the guest count.',
            });
        }
    };

    const handleCheckoutAndBill = async () => {
        if (!firestore) return;

        const batch = writeBatch(firestore);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        
        // Fetch all extra orders for this booking.
        const ordersSnapshot = await getDocs(collection(firestore, 'bookings', booking.id, 'orders'));
        let allItems: any[] = [];
        let extraCharges = 0;
        ordersSnapshot.forEach(orderDoc => {
            const orderData = orderDoc.data();
            extraCharges += orderData.totalPrice;
            if (orderData.items) {
                allItems = [...allItems, ...orderData.items];
            }
        });

        const finalBillTotal = booking.totalPrice + extraCharges - booking.advancePayment;

        // Create the final bill document
        const billRef = doc(collection(firestore, 'bills'));
        batch.set(billRef, {
            billNumber: `BILL-ROOM-${booking.roomNumber}-${Date.now()}`,
            bookingId: booking.id,
            tableNumber: `Room ${booking.roomNumber}`, // For consistency
            items: allItems,
            status: 'unpaid',
            subtotal: finalBillTotal,
            discount: 0,
            total: finalBillTotal,
            createdAt: serverTimestamp(),
        });
        
        // Update booking status to 'checked-out'
        batch.update(bookingRef, { status: 'checked-out', extraCharges, updatedAt: serverTimestamp() });
        
        // Update room status to 'available'
        const roomRef = doc(firestore, 'rooms', booking.roomId);
        batch.update(roomRef, { status: 'available' });
        
        try {
            await batch.commit();
            toast({
                title: 'Sent to Billing',
                description: `Final bill for ${booking.guestName} is ready for payment.`,
            });
        } catch(error) {
            console.error('Checkout failed:', error);
            toast({
                variant: 'destructive',
                title: 'Checkout Failed',
                description: 'Could not process the checkout and billing.',
            });
        }
    };

    return (
        <>
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{booking.guestName}</span>
                         <span className="text-lg font-medium text-muted-foreground flex items-center gap-2"><BedDouble className="w-5 h-5" /> Room {booking.roomNumber}</span>
                    </CardTitle>
                    <CardDescription>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{format(checkInDate, 'PPP')} to {format(checkOutDate, 'PPP')}</span>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Guests</h4>
                        <div className="flex items-center gap-4">
                             <div className="flex-1 space-y-1">
                                <Label htmlFor={`adults-${booking.id}`}>Adults</Label>
                                <Input id={`adults-${booking.id}`} type="number" value={localAdults} onChange={(e) => setLocalAdults(Number(e.target.value))} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label htmlFor={`children-${booking.id}`}>Children</Label>
                                <Input id={`children-${booking.id}`} type="number" value={localChildren} onChange={(e) => setLocalChildren(Number(e.target.value))} />
                            </div>
                            <Button onClick={handlePersonCountChange} size="sm" className="self-end" disabled={localAdults === booking.adults && localChildren === booking.children}>Update</Button>
                        </div>
                    </div>
                     <Separator />
                     <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4"/> Package Activities</h4>
                         <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                             {stayDays.map(day => {
                                 const dateString = format(day, 'yyyy-MM-dd');
                                 const dailyActivities = booking.packageActivities?.[dateString] || {};
                                 return (
                                     <div key={dateString}>
                                         <p className="font-medium text-sm mb-2">{format(day, 'eeee, MMM d')}</p>
                                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-2">
                                             {Object.keys(packageActivityLabels).map(activityKey => (
                                                 <div key={activityKey} className="flex items-center space-x-2">
                                                     <Checkbox 
                                                        id={`${booking.id}-${dateString}-${activityKey}`}
                                                        checked={dailyActivities[activityKey as keyof PackageActivity] || false}
                                                        onCheckedChange={(checked) => handlePackageActivityChange(day, activityKey as keyof PackageActivity, !!checked)}
                                                      />
                                                     <Label htmlFor={`${booking.id}-${dateString}-${activityKey}`} className="text-sm font-normal">
                                                        {packageActivityLabels[activityKey as keyof PackageActivity]}
                                                     </Label>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )
                            })}
                         </div>
                     </div>
                </CardContent>
                <CardFooter className="flex flex-col lg:flex-row gap-2 border-t pt-4">
                     <Button variant="outline" className="w-full" onClick={() => setIsAddToBillModalOpen(true)}>
                        <Utensils className="mr-2" /> Add to Bill
                    </Button>
                    <Button className="w-full" onClick={handleCheckoutAndBill}>
                        <LogOut className="mr-2" /> Checkout & Bill
                    </Button>
                </CardFooter>
            </Card>
            <AddToBillModal 
                booking={booking}
                isOpen={isAddToBillModalOpen}
                onClose={() => setIsAddToBillModalOpen(false)}
            />
        </>
    );
}
