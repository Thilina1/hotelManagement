
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import type { Reservation, Room } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { DateRangePickerModal } from '../bookings/date-range-picker-modal';
import { format, differenceInCalendarDays } from 'date-fns';

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  checkInDate: z.date({ required_error: "Check-in date is required."}),
  checkOutDate: z.date({ required_error: "Check-out date is required."}),
  numberOfGuests: z.coerce.number().min(1, { message: 'At least one guest is required.' }),
  totalCost: z.coerce.number().min(0),
  specialRequests: z.string().optional(),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']),
}).refine(data => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date.",
  path: ["checkOutDate"],
});


interface ReservationFormProps {
  reservation?: Reservation | null;
  rooms: Room[];
  onClose: () => void;
}

export function ReservationForm({ reservation, rooms, onClose }: ReservationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: reservation?.roomId || '',
      guestName: reservation?.guestName || '',
      guestEmail: reservation?.guestEmail || '',
      checkInDate: reservation?.checkInDate ? new Date(reservation.checkInDate) : undefined,
      checkOutDate: reservation?.checkOutDate ? new Date(reservation.checkOutDate) : undefined,
      numberOfGuests: reservation?.numberOfGuests || 1,
      totalCost: reservation?.totalCost || 0,
      specialRequests: reservation?.specialRequests || '',
      status: reservation?.status || 'confirmed',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user ) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save reservation.' });
        return;
    };

    const selectedRoom = rooms.find(r => r.id === values.roomId);
    if (!selectedRoom) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected room not found.' });
      return;
    }

    const reservationData = {
        ...values,
        bookingDate: reservation?.bookingDate || new Date().toISOString(),
        checkInDate: values.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD
        checkOutDate: values.checkOutDate.toISOString().split('T')[0], // YYYY-MM-DD
        roomTitle: selectedRoom.title,
        guestId: reservation?.guestId || user.uid, // Persist guestId on edit
    };
    
    try {
      if (reservation) {
        // Update existing reservation
        await updateDoc(doc(firestore, 'reservations', reservation.id), reservationData);
        toast({ title: 'Reservation Updated', description: 'The reservation has been successfully updated.' });
      } else {
        // Create new reservation
        await addDoc(collection(firestore, 'reservations'), reservationData);
        toast({ title: 'Reservation Created', description: 'A new reservation has been successfully created.' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reservation.' });
    }
  };
  
  const availableRooms = rooms.filter(room => room.status === 'available' || room.id === reservation?.roomId);
  const checkInDate = form.watch('checkInDate');
  const checkOutDate = form.watch('checkOutDate');
  
  const dayCount = checkInDate && checkOutDate ? differenceInCalendarDays(checkOutDate, checkInDate) : 0;

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!reservation && reservation.status !== 'confirmed'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.title} ({room.type}) - LKR {room.pricePerNight}/night
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <FormLabel>Booking Dates</FormLabel>
                {dayCount > 0 && <span className="text-sm font-medium text-muted-foreground">{dayCount} night(s)</span>}
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setIsDatePickerOpen(true)}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkInDate && checkOutDate
                ? `${format(checkInDate, 'PPP')} - ${format(checkOutDate, 'PPP')}`
                : <span>Select check-in and check-out dates</span>
                }
            </Button>
            {form.formState.errors.checkInDate && <FormMessage>{form.formState.errors.checkInDate.message}</FormMessage>}
            {form.formState.errors.checkOutDate && <FormMessage>{form.formState.errors.checkOutDate.message}</FormMessage>}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Email</FormLabel>
                  <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="numberOfGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Guests</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cost (LKR)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g. 30000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests</FormLabel>
                  <FormControl><Textarea placeholder="Any special requests or notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
         <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reservation Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="checked-in">Checked-In</SelectItem>
                      <SelectItem value="checked-out">Checked-Out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

        <Button type="submit" className="w-full">
            {reservation ? 'Update Reservation' : 'Create Reservation'}
        </Button>
      </form>
    </Form>
     <DateRangePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={(range) => {
            if (range?.from) form.setValue('checkInDate', range.from, { shouldValidate: true });
            if (range?.to) form.setValue('checkOutDate', range.to, { shouldValidate: true });
            setIsDatePickerOpen(false);
        }}
        initialDateRange={{
            from: form.getValues('checkInDate'),
            to: form.getValues('checkOutDate'),
        }}
        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !reservation}
    />
    </>
  );
}
