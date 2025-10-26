
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, LogIn, LogOut, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
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
import { format } from 'date-fns';

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const handleAddBookingClick = () => {
    setEditingBooking(null);
    setIsDialogOpen(true);
  };

  const handleEditBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setIsDialogOpen(true);
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
      // Check if another booking has this room before making it available
      const roomSnap = await getDoc(roomDocRef);
      if (roomSnap.exists() && roomSnap.data().status === 'occupied') {
         batch.update(roomDocRef, { status: 'available' });
      }
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

      // If room was occupied by this booking, make it available
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
        
        // Fetch room details to denormalize roomNumber and update status
        const roomDocRef = doc(firestore, 'rooms', values.roomId);
        const roomSnap = await getDoc(roomDocRef);
        if (!roomSnap.exists()) {
            throw new Error("Selected room does not exist.");
        }
        const roomData = roomSnap.data();
        const dataToSave = { ...values, roomNumber: roomData.roomNumber };

        if (editingBooking) {
            // Update existing booking
            const bookingDocRef = doc(firestore, 'bookings', editingBooking.id);
            batch.update(bookingDocRef, {
                ...dataToSave,
                updatedAt: serverTimestamp(),
            });

            // Handle room status change if booking status changes
            if (originalBooking && originalBooking.status !== values.status) {
                 if (values.status === 'checked-out' || values.status === 'cancelled') {
                    batch.update(doc(firestore, 'rooms', values.roomId), { status: 'available' });
                 } else if (values.status === 'confirmed' || values.status === 'checked-in') {
                    batch.update(doc(firestore, 'rooms', values.roomId), { status: 'occupied' });
                 }
            }
             // Handle room change
            if (originalBooking && originalBooking.roomId !== values.roomId) {
                // Make old room available
                batch.update(doc(firestore, 'rooms', originalBooking.roomId), { status: 'available' });
                // Make new room occupied
                if (values.status === 'confirmed' || values.status === 'checked-in') {
                   batch.update(doc(firestore, 'rooms', values.roomId), { status: 'occupied' });
                }
            }

            toast({
              title: "Booking Updated",
              description: "The booking details have been updated.",
            });
        } else {
            // Create new booking
            const newBookingRef = doc(collection(firestore, 'bookings'));
            batch.set(newBookingRef, {
                ...dataToSave,
                id: newBookingRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            // Set room to occupied
            if (values.status === 'confirmed' || values.status === 'checked-in') {
               batch.update(roomDocRef, { status: 'occupied' });
            }
            toast({
                title: "Booking Created",
                description: "A new booking has been successfully added.",
            });
        }

        await batch.commit();

        setIsDialogOpen(false);
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

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) { // Firestore Timestamp
        return format(new Date(date.seconds * 1000), 'PPP');
    }
    return format(new Date(date), 'PPP');
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
            <h1 className="text-3xl font-headline font-bold">Bookings</h1>
            <p className="text-muted-foreground">Manage all hotel room bookings.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingBooking(null);
          setIsDialogOpen(open);
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
                <TableHead>Advance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areBookingsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areBookingsLoading && bookings && bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    <div>{booking.guestName}</div>
                    <div className="text-sm text-muted-foreground">{booking.guestNic}</div>
                    <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                  </TableCell>
                  <TableCell>{booking.roomNumber || 'N/A'}</TableCell>
                  <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                  <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                  <TableCell>LKR {booking.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>LKR {booking.advancePayment?.toFixed(2) || '0.00'}</TableCell>
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
                           <DropdownMenuItem onClick={() => handleUpdateStatus(booking, 'checked-out')}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Check-out
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No bookings found. Add one to get started.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
