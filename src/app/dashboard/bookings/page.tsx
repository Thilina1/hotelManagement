
'use client';

import { useState, useMemo } from 'react';
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoreHorizontal, PlusCircle, Trash2, Edit, CheckCircle, BedDouble } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus, Room } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingForm } from '@/components/dashboard/bookings/booking-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useUserContext } from '@/context/user-context';
import { format } from 'date-fns';

const statusColors: Record<BookingStatus, string> = {
    confirmed: 'bg-blue-500 text-white',
    'checked-in': 'bg-yellow-500 text-white',
    'checked-out': 'bg-green-500 text-white',
    cancelled: 'bg-red-500 text-white',
};

export default function BookingManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const bookingsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bookings');
  }, [firestore]);
  
  const roomsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'rooms');
  }, [firestore]);

  const { data: bookings, isLoading: areBookingsLoading } = useCollection<Booking>(bookingsCollection);
  const { data: rooms, isLoading: areRoomsLoading } = useCollection<Room>(roomsCollection);

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
  
  const handleDeleteBooking = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this booking? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'bookings', id))
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

  const handleCheckIn = async (booking: Booking) => {
     if(!firestore) return;
     const bookingRef = doc(firestore, 'bookings', booking.id);
     const roomRef = doc(firestore, 'rooms', booking.roomId);
     await updateDoc(bookingRef, { status: 'checked-in' });
     await updateDoc(roomRef, { status: 'occupied' });
     toast({ title: 'Checked In', description: `${booking.guestName} has been checked in.` });
  }

  
  const sortedBookings = useMemo(() => {
    if (!bookings) return [];
    return [...bookings].sort((a, b) => {
      const dateA = a.checkInDate ? new Date(a.checkInDate).getTime() : 0;
      const dateB = b.checkInDate ? new Date(b.checkInDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [bookings]);

  const getFormattedDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return format(date, 'PPP');
  };

  if (!currentUser || areBookingsLoading || areRoomsLoading) {
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
            <p className="text-muted-foreground">Manage all room bookings.</p>
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
                    rooms={rooms || []}
                    onClose={() => setIsDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>A list of all current and past bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room No.</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areBookingsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areBookingsLoading && sortedBookings && sortedBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.guestName}</TableCell>
                  <TableCell>{booking.roomNumber}</TableCell>
                  <TableCell>{getFormattedDate(booking.checkInDate)}</TableCell>
                  <TableCell>{getFormattedDate(booking.checkOutDate)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleCheckIn(booking)}>
                                <CheckCircle className="mr-2 h-4 w-4"/>
                                Check-In
                            </DropdownMenuItem>
                         )}
                        <DropdownMenuItem onClick={() => handleEditBookingClick(booking)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            View/Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteBooking(booking.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areBookingsLoading && (!sortedBookings || sortedBookings.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No bookings found.
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
