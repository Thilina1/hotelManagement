
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, CheckCircle, BedDouble, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Reservation, ReservationStatus, Room } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ReservationForm } from '@/components/dashboard/reservations/reservation-form';
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

const statusColors: Record<ReservationStatus, string> = {
    booked: 'bg-blue-200 text-blue-800',
    confirmed: 'bg-blue-500 text-white',
    'checked-in': 'bg-yellow-500 text-white',
    'checked-out': 'bg-green-500 text-white',
    cancelled: 'bg-red-500 text-white',
};

export default function ReservationManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  
  const reservationsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'reservations');
  }, [firestore]);
  
  const roomsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'rooms');
  }, [firestore]);

  const { data: reservations, isLoading: areReservationsLoading } = useCollection<Reservation>(reservationsCollection);
  const { data: rooms, isLoading: areRoomsLoading } = useCollection<Room>(roomsCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const handleAddReservationClick = () => {
    setEditingReservation(null);
    setIsDialogOpen(true);
  };

  const handleEditReservationClick = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setIsDialogOpen(true);
  };
  
  const handleDeleteReservation = async (id: string) => {
    if(!firestore) return;
    if(confirm('Are you sure you want to delete this reservation? This cannot be undone.')) {
      deleteDoc(doc(firestore, 'reservations', id))
        .then(() => {
            toast({
                title: 'Reservation Deleted',
                description: 'The reservation has been successfully removed.',
            });
        })
        .catch(error => {
            console.error("Error deleting reservation: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete reservation.",
            });
        });
    }
  };

  const handleCheckIn = async (reservation: Reservation) => {
     if(!firestore) return;
     const reservationRef = doc(firestore, 'reservations', reservation.id);
     const roomRef = doc(firestore, 'rooms', reservation.roomId);
     await updateDoc(reservationRef, { status: 'checked-in' });
     await updateDoc(roomRef, { status: 'occupied' });
     toast({ title: 'Checked In', description: `${reservation.guestName} has been checked in.` });
  }

  const handleCheckOut = async (reservation: Reservation) => {
    if (!firestore) return;
    const reservationRef = doc(firestore, 'reservations', reservation.id);
    const roomRef = doc(firestore, 'rooms', reservation.roomId);
    await updateDoc(reservationRef, { status: 'checked-out' });
    await updateDoc(roomRef, { status: 'available' });
    toast({ title: 'Checked Out', description: `${reservation.guestName} has been checked out.` });
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    if (!firestore) return;
    if (confirm(`Are you sure you want to cancel the reservation for ${reservation.guestName}?`)) {
      const reservationRef = doc(firestore, 'reservations', reservation.id);
      const roomRef = doc(firestore, 'rooms', reservation.roomId);

      try {
        await updateDoc(reservationRef, { status: 'cancelled' });
        if (reservation.status === 'checked-in' || reservation.status === 'confirmed') {
             await updateDoc(roomRef, { status: 'available' });
        }
        toast({ title: 'Reservation Cancelled', description: `The reservation for ${reservation.guestName} has been cancelled.` });
      } catch (error) {
         console.error("Error cancelling reservation: ", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to cancel reservation.",
         });
      }
    }
  };

  
  const sortedReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations].sort((a, b) => {
      const dateA = a.checkInDate ? new Date(a.checkInDate).getTime() : 0;
      const dateB = b.checkInDate ? new Date(b.checkInDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [reservations]);

  const getFormattedDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      // Add a day to compensate for timezone issues where parsing assumes UTC
      const date = new Date(dateString);
      date.setDate(date.getDate() + 1);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return format(date, 'PPP');
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (!currentUser || areReservationsLoading || areRoomsLoading) {
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
            <h1 className="text-3xl font-headline font-bold">Reservation Management</h1>
            <p className="text-muted-foreground">Manage all room reservations.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingReservation(null);
          setIsDialogOpen(open);
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleAddReservationClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Reservation
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingReservation ? 'Edit Reservation' : 'Add New Reservation'}</DialogTitle>
                </DialogHeader>
                <ReservationForm
                    reservation={editingReservation}
                    rooms={rooms || []}
                    onClose={() => setIsDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>A list of all current and past reservations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areReservationsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!areReservationsLoading && sortedReservations && sortedReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{reservation.guestName}</TableCell>
                  <TableCell>{reservation.roomTitle}</TableCell>
                  <TableCell>{getFormattedDate(reservation.checkInDate)}</TableCell>
                  <TableCell>{getFormattedDate(reservation.checkOutDate)}</TableCell>
                  <TableCell>LKR {reservation.totalCost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize ${statusColors[reservation.status]}`}>
                        {reservation.status}
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
                         {reservation.status === 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleCheckIn(reservation)}>
                                <CheckCircle className="mr-2 h-4 w-4"/>
                                Check-In
                            </DropdownMenuItem>
                         )}
                         {reservation.status === 'checked-in' && (
                            <DropdownMenuItem onClick={() => handleCheckOut(reservation)}>
                                <BedDouble className="mr-2 h-4 w-4"/>
                                Check-Out
                            </DropdownMenuItem>
                         )}
                        <DropdownMenuItem onClick={() => handleEditReservationClick(reservation)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            View/Edit
                        </DropdownMenuItem>
                        {(reservation.status === 'confirmed' || reservation.status === 'checked-in') && (
                            <DropdownMenuItem onClick={() => handleCancelReservation(reservation)}>
                                <XCircle className="mr-2 h-4 w-4 text-destructive"/>
                                Cancel Reservation
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-500 hover:!text-red-500" onClick={() => handleDeleteReservation(reservation.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!areReservationsLoading && (!sortedReservations || sortedReservations.length === 0) && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No reservations found.
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
