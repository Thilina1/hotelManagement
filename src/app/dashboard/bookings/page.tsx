
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoreHorizontal, PlusCircle, Trash2, Edit, LogIn, LogOut, Ban, FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, writeBatch, getDoc, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { BookingForm } from '@/components/dashboard/bookings/booking-form';
import { format, eachDayOfInterval } from 'date-fns';
import { AddToBillModal } from '@/components/dashboard/activities/add-to-bill-modal';

const statusColors: Record<BookingStatus, string> = {
    confirmed: 'bg-blue-500 text-white',
    'checked-in': 'bg-green-500 text-white',
    'checked-out': 'bg-gray-500 text-white',
    cancelled: 'bg-red-500 text-white',
};

export default function BookingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const bookingsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);
  
  const { data: bookings, isLoading: areBookingsLoading } = useCollection<Booking>(bookingsCollection);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [inStayBooking, setInStayBooking] = useState<Booking | null>(null);

  const handleAddBookingClick = () => {
    setEditingBooking(null);
    setIsFormDialogOpen(true);
  };

  const handleEditBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setIsFormDialogOpen(true);
  };
  
  const handleUpdateStatus = async (booking: Booking, newStatus: BookingStatus) => {
    if(!firestore) return;
    
    const batch = writeBatch(firestore);
    const bookingDocRef = doc(firestore, 'bookings', booking.id);
    batch.update(bookingDocRef, { status: newStatus, updatedAt: serverTimestamp() });
    
    // Update room status based on new booking status
    const roomDocRef = doc(firestore, 'rooms', booking.roomId);
    if (newStatus === 'checked-in') {
      batch.update(roomDocRef, { status: 'occupied' });
    } else if (newStatus === 'checked-out' || newStatus === 'cancelled') {
       batch.update(roomDocRef, { status: 'cleaning' });
    }
    
    try {
      await batch.commit();
      toast({
        title: 'Status Updated',
        description: `Booking status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update booking status.",
      });
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this booking? This cannot be undone.')) {
      const batch = writeBatch(firestore);
      const bookingDocRef = doc(firestore, 'bookings', booking.id);
      batch.delete(bookingDocRef);

      if (booking.status === 'confirmed' || booking.status === 'checked-in') {
        const roomDocRef = doc(firestore, 'rooms', booking.roomId);
        batch.update(roomDocRef, { status: 'available' });
      }

      batch.commit()
        .then(() => {
            toast({
                title: 'Booking Deleted',
                description: 'The booking has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting booking: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete booking.",
            });
        });
    }
  };

  const handleFormSubmit = async (values: Omit<Booking, 'id' | 'roomNumber'>, originalBooking?: Booking | null) => {
    if (!firestore || !currentUser) return;
    
    try {
        const batch = writeBatch(firestore);
        
        const roomDocRef = doc(firestore, 'rooms', values.roomId);
        const roomSnap = await getDoc(roomDocRef);
        if (!roomSnap.exists()) {
            throw new Error("Selected room does not exist.");
        }
        const roomData = roomSnap.data();

        const checkIn = new Date(values.checkInDate as any);
        const checkOut = new Date(values.checkOutDate as any);
        const stayDays = eachDayOfInterval({ start: checkIn, end: checkOut }).slice(0, -1);
        const packageActivities = stayDays.reduce((acc, day) => {
            const dateString = format(day, 'yyyy-MM-dd');
            acc[dateString] = { breakfast: false, lunch: false, dinner: false, tea: false, activity1: false, activity2: false };
            return acc;
        }, {} as Record<string, any>);

        const dataToSave: Partial<Booking> = { 
          ...values, 
          roomNumber: roomData.roomNumber,
          packageActivities,
          extraCharges: values.extraCharges || 0,
        };
        
        if (editingBooking) {
            const bookingDocRef = doc(firestore, 'bookings', editingBooking.id);
            batch.update(bookingDocRef, {
                ...dataToSave,
                updatedAt: serverTimestamp(),
            });

            if (originalBooking && originalBooking.status !== values.status) {
                 if (values.status === 'checked-out' || values.status === 'cancelled') {
                    batch.update(doc(firestore, 'rooms', values.roomId), { status: 'available' });
                 } else if (values.status === 'confirmed' || values.status === 'checked-in') {
                    batch.update(doc(firestore, 'rooms', values.roomId), { status: 'occupied' });
                 }
            }
            if (originalBooking && originalBooking.roomId !== values.roomId) {
                batch.update(doc(firestore, 'rooms', originalBooking.roomId), { status: 'available' });
                if (values.status === 'confirmed' || values.status === 'checked-in') {
                   batch.update(doc(firestore, 'rooms', values.roomId), { status: 'occupied' });
                }
            }

            toast({
              title: "Booking Updated",
              description: "The booking details have been updated.",
            });
        } else {
            const newBookingRef = doc(collection(firestore, 'bookings'));
            batch.set(newBookingRef, {
                ...dataToSave,
                id: newBookingRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            if (values.status === 'confirmed' || values.status === 'checked-in') {
               batch.update(roomDocRef, { status: 'occupied' });
            }
            toast({
                title: "Booking Created",
                description: "A new booking has been successfully added.",
            });
        }

        await batch.commit();

        setIsFormDialogOpen(false);
        setEditingBooking(null);
    } catch (error: any) {
        console.error("Error saving booking:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: `Failed to save booking. ${error.message}`,
        });
    }
  };

  const handleCheckoutAndBill = async (booking: Booking) => {
      if (!firestore) return;

      const batch = writeBatch(firestore);
      
      const finalTotal = (booking.totalPrice || 0) + (booking.extraCharges || 0) - (booking.advancePayment || 0);

      // Create the final bill document
      const billRef = doc(collection(firestore, 'bills'));
      batch.set(billRef, {
          billNumber: `BILL-ROOM-${booking.roomNumber}-${Date.now()}`,
          bookingId: booking.id,
          tableNumber: `Room ${booking.roomNumber}`, // For consistency
          items: [], // Extra items are already part of booking.extraCharges
          status: 'unpaid',
          subtotal: finalTotal,
          discount: 0,
          total: finalTotal,
          billType: 'booking',
          createdAt: serverTimestamp(),
      });
      
      try {
          await batch.commit();
          toast({
              title: 'Sent to Billing',
              description: `Final bill for ${booking.guestName} is ready for payment.`,
          });
      } catch(error) {
          console.error('Checkout billing failed:', error);
          toast({
              variant: 'destructive',
              title: 'Checkout Failed',
              description: 'Could not send the final bill for payment.',
          });
      }
  };


  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return format(dateObj, 'PPP');
  }

  if (!currentUser || areBookingsLoading) {
     return (
       <div className="space-y-6">
        <div className="flex justify-between items-start">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-10 w-28" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
      </div>
     )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Booking Management</h1>
            <p className="text-muted-foreground">Manage all hotel room bookings.</p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingBooking(null);
          setIsFormDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddBookingClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Booking
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingBooking ? 'Edit Booking' : 'Add New Booking'}</DialogTitle>
                </DialogHeader>
                <BookingForm
                    booking={editingBooking}
                    onSubmit={handleFormSubmit}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking List</CardTitle>
          <CardDescription>A list of all current and past bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areBookingsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areBookingsLoading && bookings && bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    <div>{booking.guestName}</div>
                    <div className="text-sm text-muted-foreground">{booking.guestNic}</div>
                  </TableCell>
                  <TableCell>{booking.roomNumber || 'N/A'}</TableCell>
                  <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                  <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                  <TableCell>LKR {booking.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize ${statusColors[booking.status]}`}>
                        {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {booking.status === 'confirmed' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(booking, 'checked-in')}>
                            <LogIn className="mr-2 h-4 w-4" />
                            Check-in
                          </DropdownMenuItem>
                        )}
                         {booking.status === 'checked-in' && (
                            <>
                               <DropdownMenuItem onClick={() => setInStayBooking(booking)}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Manage In-Stay
                                </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleCheckoutAndBill(booking)}>
                                    <FileCheck2 className="mr-2 h-4 w-4"/>
                                    Checkout & Bill
                                </DropdownMenuItem>
                            </>
                        )}
                        {booking.status === 'checked-in' && (
                           <DropdownMenuItem onClick={() => handleUpdateStatus(booking, 'checked-out')}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Mark as Checked-out
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEditBookingClick(booking)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Details
                        </DropdownMenuItem>
                         {(booking.status === 'confirmed') && <DropdownMenuSeparator />}
                         {booking.status === 'confirmed' && (
                           <DropdownMenuItem className="text-amber-600 hover:!text-amber-600" onClick={() => handleUpdateStatus(booking, 'cancelled')}>
                              <Ban className="mr-2 h-4 w-4"/>
                              Cancel Booking
                           </DropdownMenuItem>
                         )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteBooking(booking)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areBookingsLoading && (!bookings || bookings.length === 0) && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No bookings found. Add one to get started.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {inStayBooking && (
        <AddToBillModal
            booking={inStayBooking}
            isOpen={!!inStayBooking}
            onClose={() => setInStayBooking(null)}
        />
      )}
    </div>
  );
}

    