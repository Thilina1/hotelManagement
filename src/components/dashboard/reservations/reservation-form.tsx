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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import type { Reservation, Room } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Please select a room.' }),
  guestName: z.string().min(2, { message: 'Guest name is required.' }),
  guestEmail: z.string().email({ message: 'Invalid email address.' }),
  dateRange: z.object({
    from: z.date({ required_error: "Check-in date is required."}),
    to: z.date().optional(),
  }),
  numberOfGuests: z.coerce.number().min(1, { message: 'At least one guest is required.' }),
  totalCost: z.coerce.number().min(0),
  specialRequests: z.string().optional(),
  status: z.enum(['confirmed', 'checked-in', 'cancelled', 'checked-out']),
}).refine(data => {
    // If a range is selected, 'to' must exist.
    if (data.dateRange.from && data.dateRange.to) {
        return true;
    }
    // If only 'from' is selected, it's valid during selection.
    if (data.dateRange.from && !data.dateRange.to) {
        return true;
    }
    return false;
}, {
    message: "Check-out date is required.",
    path: ["dateRange"],
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: reservation?.roomId || '',
      guestName: reservation?.guestName || '',
      guestEmail: reservation?.guestEmail || '',
      dateRange: {
        from: reservation?.checkInDate ? new Date(reservation.checkInDate) : new Date(),
        to: reservation?.checkOutDate ? new Date(reservation.checkOutDate) : undefined,
      },
      numberOfGuests: reservation?.numberOfGuests || 1,
      totalCost: reservation?.totalCost || 0,
      specialRequests: reservation?.specialRequests || '',
      status: reservation?.status || 'confirmed',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !values.dateRange.from || !values.dateRange.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid date range.' });
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
        checkInDate: values.dateRange.from.toISOString().split('T')[0], // YYYY-MM-DD
        checkOutDate: values.dateRange.to.toISOString().split('T')[0], // YYYY-MM-DD
        roomTitle: selectedRoom.title,
        guestId: reservation?.guestId || user.uid, // Persist guestId on edit
    };
    
    delete (reservationData as any).dateRange;

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

  return (
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
        
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Reservation Dates</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "LLL dd, y")} -{" "}
                            {format(field.value.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(field.value.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value.from}
                    selected={field.value}
                    onSelect={field.onChange}
                    numberOfMonths={2}
                    disabled={(date) =>
                      !reservation ? date < new Date(new Date().setHours(0, 0, 0, 0)) : false
                    }
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
  );
}
